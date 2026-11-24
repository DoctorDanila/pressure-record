<?php

declare(strict_types=1);

namespace core\record\domain\service;

final class SeriesCalculator
{
    /**
     * @param array<int, array{systolic:int,diastolic:int,pulse:int}> $measurements
     * @param array{systolic_high:int,diastolic_high:int,systolic_low:int,diastolic_low:int} $thresholds
     * @return array<string, mixed>
     */
    public function calculate(array $measurements, array $thresholds): array
    {
        $systolic   = array_column($measurements, 'systolic');
        $diastolic  = array_column($measurements, 'diastolic');
        $pulse      = array_column($measurements, 'pulse');

        $ranges = [
            'systolic'  => max($systolic) - min($systolic),
            'diastolic' => max($diastolic) - min($diastolic),
            'pulse'     => max($pulse) - min($pulse),
        ];
        $qualityFlag = count($measurements) === 3 && max($ranges['systolic'], $ranges['diastolic']) > 10;

        $means = [
            'systolic'  => $this->mean($systolic),
            'diastolic' => $this->mean($diastolic),
            'pulse'     => $this->mean($pulse),
        ];
        $medians = [
            'systolic'  => $this->median($systolic),
            'diastolic' => $this->median($diastolic),
            'pulse'     => $this->median($pulse),
        ];
        $point = $qualityFlag ? $medians : $means;

        return [
            'measurement_count' => count($measurements),
            'quality_flag'      => $qualityFlag,
            'ranges'            => $ranges,
            'mean'              => $means,
            'median'            => $medians,
            'point'             => $point,
            'pulse_pressure'    => round($point['systolic'] - $point['diastolic'], 1),
            'map'               => round($point['diastolic'] + ($point['systolic'] - $point['diastolic']) / 3, 1),
            'category'          => $this->classify($point['systolic'], $point['diastolic'], $thresholds),
        ];
    }

    /**
     * @param array<int, int> $values
     */
    private function mean(array $values): float
    {
        return round(array_sum($values) / count($values), 1);
    }

    /**
     * @param array<int, int> $values
     */
    private function median(array $values): float
    {
        sort($values, SORT_NUMERIC);
        $count = count($values);
        $middle = intdiv($count, 2);
        if ($count % 2 === 1) {
            return (float)$values[$middle];
        }
        return round(($values[$middle - 1] + $values[$middle]) / 2, 1);
    }

    /**
     * @param array<string, int> $thresholds
     */
    private function classify(float $systolic, float $diastolic, array $thresholds): string
    {
        if ($systolic >= $thresholds['systolic_high'] || $diastolic >= $thresholds['diastolic_high']) {
            return 'high';
        }
        if ($systolic < $thresholds['systolic_low'] || $diastolic < $thresholds['diastolic_low']) {
            return 'low';
        }
        return 'normal';
    }
}
