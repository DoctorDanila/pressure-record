<?php

declare(strict_types=1);

namespace core\record\presentation\controller;

use core\_internal\application\dto\CollectionDto;
use core\_internal\application\dto\ItemDto;
use core\_internal\application\dto\SuccessDto;
use core\_internal\presentation\controller\BaseController;
use core\record\application\service\RecordService;
use core\record\domain\dto\RecordFiltersDto;
use core\setting\application\service\SettingsService;
use Mpdf\MpdfException;
use RuntimeException;
use Yii;
use yii\base\Exception;
use yii\base\InvalidConfigException;
use yii\di\NotInstantiableException;
use yii\web\Response;
use Mpdf\Mpdf;
use Mpdf\Output\Destination;
use yii\helpers\FileHelper;

final class RecordController extends BaseController
{
    public function behaviors(): array
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats'] = [
            'application/json'  => Response::FORMAT_JSON,
            'application/pdf'   => Response::FORMAT_RAW,
        ];
        return $behaviors;
    }

    /**
     * GET /api/records
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionIndex(): CollectionDto
    {
        $filters    = $this->filters();
        $service    = $this->recordService();
        $items      = $service->getList($this->requiredUserId(), $filters);
        $total      = $service->count($this->requiredUserId(), $filters);

        return $this->collection($items, $total, (int)floor($filters->offset / max(1, $filters->limit)) + 1, $filters->limit);
    }

    /**
     * GET /api/records/{id}
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionView(int $id): ItemDto
    {
        return $this->item($this->recordService()->get($this->requiredUserId(), $id));
    }

    /**
     * POST /api/records
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionCreate(): ItemDto
    {
        $userId         = $this->requiredUserId();
        $settingsDto    = $this->settingsService()->getForUser($userId)->jsonSerialize();
        $settings       = $settingsDto['config'];

        return $this->item($this->recordService()->create(
            $userId,
            Yii::$app->request->getBodyParams(),
            $settings,
        ));
    }

    /**
     * GET /api/records/dashboard
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     * @throws \Exception
     */
    public function actionDashboard(): array
    {
        $userId     = $this->requiredUserId();
        $settings   = $this->settingsService()->getForUser($userId)->jsonSerialize()['config'];
        $params     = Yii::$app->request->get();

        return $this->recordService()->dashboard(
            $userId,
            $settings,
            isset($params['from']) ? (string)$params['from'] : null,
            isset($params['to']) ? (string)$params['to'] : null,
        );
    }

    /**
     * DELETE /api/records/{id}
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionDelete(int $id): SuccessDto
    {
        $this->recordService()->delete($this->requiredUserId(), $id);
        return $this->success(null, 'Record series deleted');
    }

    /**
     * GET /api/records/export.csv
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     */
    public function actionExport(): Response
    {
        $userId = $this->requiredUserId();
        $query  = Yii::$app->request->get();
        $planned = null;
        if (isset($query['planned'])) {
            $planned = filter_var($query['planned'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($planned === null) {
                throw new RuntimeException('planned must be a boolean.', 400);
            }
        }

        $filters = new RecordFiltersDto(
            isset($query['from']) ? (string)$query['from'] : null,
            isset($query['to']) ? (string)$query['to'] : null,
            isset($query['slot']) ? (string)$query['slot'] : null,
            $planned,
            5000,
            0,
        );

        $file = fopen('php://temp', 'w+');
        if ($file === false) {
            throw new RuntimeException('Unable to create export stream.', 500);
        }
        fwrite($file, "\xEF\xBB\xBF");
        fputcsv($file, [
            'Серия ID', 'Дата и время (МСК)', 'Слот', 'Плановое', 'Прибор ID', 'Показание №',
            'САД', 'ДАД', 'ЧСС', 'Размах САД', 'Размах ДАД', 'Низкая достоверность',
            'Среднее САД', 'Среднее ДАД', 'Среднее ЧСС', 'Медиана САД', 'Медиана ДАД', 'Медиана ЧСС',
            'Точка САД', 'Точка ДАД', 'Точка ЧСС', 'ПД', 'СГАД', 'Категория',
            'Симптомы', 'Описание состояния', 'САД высокий', 'ДАД высокий', 'САД низкий', 'ДАД низкий',
            'Исключать первый день',
        ], ';');

        foreach ($this->recordService()->getList($userId, $filters) as $dto) {
            $row = $dto->jsonSerialize();
            $snapshot = $row['settings_snapshot'] ?? [];
            foreach ($row['measurements'] ?? [] as $measurement) {
                fputcsv($file, [
                    $row['id'], $row['measured_at'], $row['slot'], $row['is_planned'] ? 'Да' : 'Нет',
                    $row['device_id'] ?? '', $measurement['position'], $measurement['systolic'],
                    $measurement['diastolic'], $measurement['pulse'], $row['metrics']['ranges']['systolic'],
                    $row['metrics']['ranges']['diastolic'], $row['quality_flag'] ? 'Да' : 'Нет',
                    $row['metrics']['mean']['systolic'], $row['metrics']['mean']['diastolic'], $row['metrics']['mean']['pulse'],
                    $row['metrics']['median']['systolic'], $row['metrics']['median']['diastolic'], $row['metrics']['median']['pulse'],
                    $row['metrics']['point']['systolic'], $row['metrics']['point']['diastolic'], $row['metrics']['point']['pulse'],
                    $row['metrics']['pulse_pressure'], $row['metrics']['map'], $row['metrics']['category'],
                    implode(', ', $row['symptoms'] ?? []), $row['notes'] ?? '',
                    $snapshot['systolic_high'] ?? '', $snapshot['diastolic_high'] ?? '',
                    $snapshot['systolic_low'] ?? '', $snapshot['diastolic_low'] ?? '',
                    !empty($snapshot['exclude_first_day']) ? 'Да' : 'Нет',
                ], ';');
            }
        }

        rewind($file);
        $csv = stream_get_contents($file);
        fclose($file);

        $response = Yii::$app->response;
        $response->format = Response::FORMAT_RAW;
        $response->headers->set('Content-Type', 'text/csv; charset=UTF-8');
        $response->headers->set('Content-Disposition', 'attachment; filename="pressure-records.csv"');
        $response->headers->set('Cache-Control', 'no-store');
        $response->content = $csv === false ? '' : $csv;
        return $response;
    }

    /**
     * GET /api/records/export.pdf
     * @throws NotInstantiableException
     * @throws InvalidConfigException
     * @throws Exception
     * @throws MpdfException
     * @throws \Exception
     */
    public function actionExportPdf(): Response
    {
        $userId = $this->requiredUserId();
        $query = Yii::$app->request->get();

        $settings = $this->settingsService()
            ->getForUser($userId)
            ->jsonSerialize()['config'];

        // Получаем готовую аналитику дэшборда.
        $dashboard = $this->recordService()->dashboard(
            $userId,
            $settings,
            isset($query['from']) ? (string)$query['from'] : null,
            isset($query['to']) ? (string)$query['to'] : null,
        );

        $escape = static fn($value): string => htmlspecialchars(
            (string)($value ?? '—'),
            ENT_QUOTES | ENT_SUBSTITUTE,
            'UTF-8'
        );

        $format = static fn($value): string => $value === null
            ? '—'
            : number_format((float)$value, 1, ',', ' ');

        $summary = $dashboard['summary'];

        $slotLabels = [
            'morning'       => 'Утро',
            'day'           => 'День',
            'evening'       => 'Вечер',
            'unscheduled'   => 'Вне плана',
        ];

        $categoryLabels = [
            'low'       => 'Заниженное',
            'normal'    => 'Норма',
            'high'      => 'Завышенное',
        ];

        // 1. ГИСТОГРАММА СРЕДНИХ ТОЧЕК ПЛАНОВЫХ СЕРИЙ

        $distribution = $dashboard['distribution'] ?? [];

        $distributionCounts = array_map(
            static fn(array $item): int => max(
                0,
                (int)($item['count'] ?? 0)
            ),
            $distribution
        );

        $maxDistributionCount = max([1, ...$distributionCounts]);

        $distributionRows = '';

        foreach ($distribution as $item) {
            $range = (string)($item['range'] ?? '—');
            $count = max(0, (int)($item['count'] ?? 0));

            $barWidth = round(
                $count / $maxDistributionCount * 100,
                2
            );

            $emptyWidth = max(0, round(100 - $barWidth, 2));

            $distributionRows .= '
            <tr>
                <td width="75">
                    ' . $escape($range) . '
                </td>

                <td>
                    <table class="chart-bar">
                        <tr>
                            <td
                                width="' . $barWidth . '%"
                                bgcolor="#7da7e8"
                                height="12"
                            ></td>

                            <td
                                width="' . $emptyWidth . '%"
                                bgcolor="#edf1f6"
                                height="12"
                            ></td>
                        </tr>
                    </table>
                </td>

                <td width="35" align="right">
                    <strong>' . $count . '</strong>
                </td>
            </tr>
        ';
        }

        if ($distributionRows === '') {
            $distributionRows = '
            <tr>
                <td colspan="3">
                    Недостаточно данных для построения гистограммы.
                </td>
            </tr>
        ';
        }

        $distributionChartHtml = '
        <table class="chart-table">
            <thead>
                <tr>
                    <th>САД, мм рт. ст.</th>
                    <th>Распределение</th>
                    <th>Серий</th>
                </tr>
            </thead>

            <tbody>
                ' . $distributionRows . '
            </tbody>
        </table>
    ';

        // 2. ГИСТОГРАММА РАСПРЕДЕЛЕНИЯ ПО НЕДЕЛЯМ

        $weekly = $dashboard['weekly'] ?? [];

        $weeklyTotals = array_map(
            static fn(array $item): int => (int)($item['total'] ?? (
                (int)($item['normal'] ?? 0)
                + (int)($item['low'] ?? 0)
                + (int)($item['high'] ?? 0)
            )),
            $weekly
        );

        $maxWeeklyTotal = max([1, ...$weeklyTotals]);

        $weeklyRows = '';

        foreach ($weekly as $item) {
            $week = (string)($item['week'] ?? '—');

            $normal = max(0, (int)($item['normal'] ?? 0));
            $low = max(0, (int)($item['low'] ?? 0));
            $high = max(0, (int)($item['high'] ?? 0));

            $total = $normal + $low + $high;

            // Каждый сегмент пропорционален общему максимальному
            // числу серий за одну неделю.
            $normalWidth = round(
                $normal / $maxWeeklyTotal * 100,
                2
            );

            $lowWidth = round(
                $low / $maxWeeklyTotal * 100,
                2
            );

            $highWidth = round(
                $high / $maxWeeklyTotal * 100,
                2
            );

            $filledWidth = min(
                100,
                $normalWidth + $lowWidth + $highWidth
            );

            $emptyWidth = max(
                0,
                round(100 - $filledWidth, 2)
            );

            $weeklyRows .= '
            <tr>
                <td width="75">
                    ' . $escape($week) . '
                </td>

                <td>
                    <table class="chart-bar">
                        <tr>
                            <td
                                width="' . $normalWidth . '%"
                                bgcolor="#34c99a"
                                height="13"
                            ></td>

                            <td
                                width="' . $lowWidth . '%"
                                bgcolor="#80a9e9"
                                height="13"
                            ></td>

                            <td
                                width="' . $highWidth . '%"
                                bgcolor="#f28d85"
                                height="13"
                            ></td>

                            <td
                                width="' . $emptyWidth . '%"
                                bgcolor="#edf1f6"
                                height="13"
                            ></td>
                        </tr>
                    </table>
                </td>

                <td width="35" align="right">
                    <strong>' . $total . '</strong>
                </td>

                <td width="135">
                    Норма: ' . $normal . ' ·
                    Низкие: ' . $low . ' ·
                    Высокие: ' . $high . '
                </td>
            </tr>
        ';
        }

        if ($weeklyRows === '') {
            $weeklyRows = '
            <tr>
                <td colspan="4">
                    Недостаточно данных для недельной статистики.
                </td>
            </tr>
        ';
        }

        $weeklyChartHtml = '
        <table class="chart-table">
            <thead>
                <tr>
                    <th>Неделя</th>
                    <th>Распределение категорий</th>
                    <th>Всего</th>
                    <th>Состав</th>
                </tr>
            </thead>

            <tbody>
                ' . $weeklyRows . '
            </tbody>
        </table>
    ';

        // 3. ИСХОДНЫЕ ДАННЫЕ

        $rows = '';

        foreach ($dashboard['records'] as $record) {
            $measurements = [];

            foreach ($record['measurements'] as $measurement) {
                $measurements[] = sprintf(
                    '%d/%d, пульс %d',
                    $measurement['systolic'],
                    $measurement['diastolic'],
                    $measurement['pulse'],
                );
            }

            $point = $record['metrics']['point'];

            $wellbeing = implode(
                ', ',
                $record['symptoms'] ?? []
            );

            if (!empty($record['notes'])) {
                $wellbeing .= ($wellbeing !== '' ? '. ' : '')
                    . $record['notes'];
            }

            $date = date(
                'd.m.Y H:i',
                strtotime($record['measured_at'])
            );

            $rows .= '
            <tr>
                <td>' . $escape($date) . '</td>

                <td>' . $escape(
                    $slotLabels[$record['slot']]
                    ?? $record['slot']
                ) . '</td>

                <td>' . $escape(
                    implode('; ', $measurements)
                ) . '</td>

                <td>' . $escape(
                    round($point['systolic']) . '/'
                    . round($point['diastolic'])
                ) . '</td>

                <td>' . $escape(
                    round($point['pulse'])
                ) . '</td>

                <td>' . $escape(
                    $categoryLabels[$record['metrics']['category']]
                    ?? '—'
                ) . '</td>

                <td>' . (
                $record['quality_flag']
                    ? 'Низкая достоверность'
                    : 'Норма'
                ) . '</td>

                <td>' . $escape(
                    $record['is_planned']
                        ? 'Плановое'
                        : 'Внеплановое'
                ) . '</td>

                <td>' . $escape(
                    $wellbeing ?: '—'
                ) . '</td>
            </tr>
        ';
        }

        if ($rows === '') {
            $rows = '
            <tr>
                <td colspan="9">
                    Нет измерений за выбранный период.
                </td>
            </tr>
        ';
        }

        // 4. HTML ДОКУМЕНТА

        $html = '
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">

        <style>
            body {
                font-family: dejavusans;
                font-size: 9pt;
                color: #202733;
            }

            h1 {
                font-size: 20pt;
                margin-bottom: 5px;
            }

            h2 {
                font-size: 13pt;
                margin-top: 22px;
                margin-bottom: 8px;
            }

            .muted {
                color: #748094;
                font-size: 8pt;
            }

            .summary {
                width: 100%;
                border-collapse: collapse;
                margin-top: 15px;
            }

            .summary td {
                border: 1px solid #dfe4eb;
                padding: 9px;
                width: 25%;
            }

            .summary strong {
                display: block;
                font-size: 14pt;
                margin-top: 5px;
            }

            /* Гистограммы */

            .chart-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 8pt;
            }

            .chart-table th {
                background: #edf1f6;
                font-weight: bold;
                text-align: left;
            }

            .chart-table > thead > tr > th,
            .chart-table > tbody > tr > td {
                border-bottom: 1px solid #dce2ea;
                padding: 6px;
                vertical-align: middle;
            }

            .chart-bar {
                width: 100%;
                border-collapse: collapse;
                table-layout: fixed;
            }

            .chart-table .chart-bar td {
                border: none;
                padding: 0;
                height: 13px;
            }

            .chart-description {
                color: #748094;
                font-size: 8pt;
                margin-bottom: 8px;
            }

            .chart-legend {
                width: 100%;
                margin-top: 8px;
                font-size: 8pt;
                border-collapse: collapse;
            }

            .chart-legend td {
                padding: 4px;
            }

            /* Исходные данные */

            table.records {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 7pt;
            }

            table.records th {
                background: #edf1f6;
                font-weight: bold;
            }

            table.records th,
            table.records td {
                border: 1px solid #dce2ea;
                padding: 5px;
                vertical-align: top;
            }

            table.records tr {
                page-break-inside: avoid;
            }
        </style>
    </head>

    <body>

        <h1>Отчёт по артериальному давлению</h1>

        <div class="muted">
            Script Agency Pressure Record ·
            ' . date('d.m.Y H:i') . '
        </div>

        <!-- СВОДНАЯ СТАТИСТИКА -->

        <h2>Сводная статистика</h2>

        <table class="summary">
            <tr>
                <td>
                    Среднее САД

                    <strong>
                        ' . $escape($format($summary['average_systolic'])) . '
                    </strong>

                    мм рт. ст.
                </td>

                <td>
                    Среднее ДАД

                    <strong>
                        ' . $escape($format($summary['average_diastolic'])) . '
                    </strong>

                    мм рт. ст.
                </td>

                <td>
                    Средняя ЧСС

                    <strong>
                        ' . $escape($format($summary['average_pulse'])) . '
                    </strong>

                    уд/мин
                </td>

                <td>
                    В целевых значениях

                    <strong>
                        ' . $escape($format($summary['time_in_target_percent'])) . '%
                    </strong>
                </td>
            </tr>
        </table>

        <p>
            Всего серий: ' . (int)$summary['series_count'] . '.

            Плановых: ' . (int)$summary['planned_series_count'] . '.

            Внеплановых: ' . (int)$summary['unscheduled_series_count'] . '.
        </p>

        <p class="muted">
            Период:
            ' . $escape($query['from'] ?? 'без ограничения') . '
            —
            ' . $escape($query['to'] ?? 'без ограничения') . '
        </p>


        <!-- ГИСТОГРАММА САД -->

        <h2>
            Распределение средних точек плановых серий
        </h2>

        <p class="chart-description">
            Количество плановых серий в каждом диапазоне
            систолического артериального давления.

            Для серий с низкой достоверностью используется
            медианная точка согласно методике.
        </p>

        ' . $distributionChartHtml . '


        <!-- НЕДЕЛЬНАЯ ГИСТОГРАММА -->

        <h2>
            Распределение плановых серий по неделям
        </h2>

        <table class="chart-legend">
            <tr>
                <td>
                    <span style="color: #34c99a">■</span>
                    Норма
                </td>

                <td>
                    <span style="color: #80a9e9">■</span>
                    Заниженное
                </td>

                <td>
                    <span style="color: #f28d85">■</span>
                    Завышенное
                </td>
            </tr>
        </table>

        ' . $weeklyChartHtml . '


        <!-- ИСХОДНЫЕ ИЗМЕРЕНИЯ -->

        <h2>Исходные данные</h2>

        <table class="records">
            <thead>
                <tr>
                    <th>Дата (МСК)</th>
                    <th>Слот</th>
                    <th>Показания</th>
                    <th>Средняя точка</th>
                    <th>ЧСС</th>
                    <th>Категория</th>
                    <th>Качество</th>
                    <th>Тип</th>
                    <th>Самочувствие</th>
                </tr>
            </thead>

            <tbody>
                ' . $rows . '
            </tbody>
        </table>
    </body>
    </html>
    ';

        // 5. ГЕНЕРАЦИЯ PDF

        $tempDir = Yii::getAlias('@runtime/mpdf');

        FileHelper::createDirectory($tempDir);

        $mpdf = new Mpdf([
            'mode'          => 'utf-8',
            'format'        => 'A4-L',
            'tempDir'       => $tempDir,
            'default_font'  => 'dejavusans',
            'margin_left'   => 10,
            'margin_right'  => 10,
            'margin_top'    => 12,
            'margin_bottom' => 15,
        ]);

        $mpdf->SetTitle('Отчёт Pressure Record');

        $mpdf->SetAuthor(
            'Script Agency Pressure Record'
        );

        $mpdf->SetHTMLFooter(
            '<div style="text-align:center;font-size:8pt;color:#8490a1">
            Script Agency Pressure Record ·
            Страница {PAGENO} из {nbpg}
        </div>'
        );

        $mpdf->WriteHTML($html);

        $pdf = $mpdf->Output(
            'pressure-records.pdf',
            Destination::STRING_RETURN
        );

        // 6. HTTP RESPONSE

        $response = Yii::$app->response;

        $response->format = Response::FORMAT_RAW;

        $response->headers->set(
            'Content-Type',
            'application/pdf'
        );

        $response->headers->set(
            'Content-Disposition',
            'attachment; filename="pressure-records.pdf"'
        );

        $response->headers->set(
            'Cache-Control',
            'no-store'
        );

        $response->content = $pdf;

        return $response;
    }

    private function requiredUserId(): int
    {
        $id = $this->getUserId();
        if ($id === null) {
            throw new RuntimeException('Unauthorized', 401);
        }
        return (int)$id;
    }

    private function filters(): RecordFiltersDto
    {
        $params = Yii::$app->request->get();
        $planned = null;
        if (isset($params['planned'])) {
            $planned = filter_var($params['planned'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            if ($planned === null) {
                throw new RuntimeException('planned must be a boolean.', 400);
            }
        }
        $limit = max(1, min((int)($params['limit'] ?? 100), 1000));
        return new RecordFiltersDto(
            isset($params['from']) ? (string)$params['from'] : null,
            isset($params['to']) ? (string)$params['to'] : null,
            isset($params['slot']) ? (string)$params['slot'] : null,
            $planned,
            $limit,
            max(0, (int)($params['offset'] ?? 0)),
        );
    }

    /**
     * @throws InvalidConfigException
     * @throws NotInstantiableException
     */
    private function recordService(): RecordService
    {
        return Yii::$container->get(RecordService::class);
    }

    /**
     * @throws InvalidConfigException
     * @throws NotInstantiableException
     */
    private function settingsService(): SettingsService
    {
        return Yii::$container->get(SettingsService::class);
    }
}
