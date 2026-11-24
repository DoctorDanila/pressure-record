<?php

declare(strict_types=1);

namespace core\record\infrastructure\migrations;

use yii\db\Migration;

final class m261122_000002_create_record_tables extends Migration
{
    private const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    public function safeUp(): void
    {
        // Серия хранит контекст замера и снимок конфигурации порогов на момент записи
        $this->createTable('{{%record_series}}', [
            'id'                => $this->primaryKey(),
            'user_id'           => $this->integer()->notNull(),
            'device_id'         => $this->integer()->null(),
            'slot'              => $this->string(20)->notNull()->comment('morning | day | evening | unscheduled'),
            'is_planned'        => $this->boolean()->notNull()->defaultValue(true),
            'measured_at'       => $this->dateTime()->notNull()->comment('Локальное время Europe/Moscow'),
            'notes'             => $this->text()->null(),
            'symptoms'          => $this->json()->notNull(),
            'settings_snapshot' => $this->json()->notNull(),
            'measurement_count' => $this->tinyInteger()->notNull(),
            'quality_flag'      => $this->boolean()->notNull()->defaultValue(false),
            'systolic_range'    => $this->smallInteger()->notNull()->defaultValue(0),
            'diastolic_range'   => $this->smallInteger()->notNull()->defaultValue(0),
            'created_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'INDEX idx_record_series_user_date (user_id, measured_at)',
            'INDEX idx_record_series_user_planned (user_id, is_planned, measured_at)',
            'CONSTRAINT fk_record_series_user FOREIGN KEY (user_id) REFERENCES {{%user}} (id) ON DELETE CASCADE',
            'CONSTRAINT fk_record_series_device FOREIGN KEY (device_id) REFERENCES {{%device}} (id) ON DELETE SET NULL',
        ], self::TABLE_OPTIONS);

        // Сами показания не агрегируются и не перезаписываются аналитическими значениями
        $this->createTable('{{%record_measurement}}', [
            'id'            => $this->primaryKey(),
            'series_id'     => $this->integer()->notNull(),
            'position'      => $this->tinyInteger()->notNull(),
            'systolic'      => $this->smallInteger()->notNull()->comment('САД, мм рт. ст.'),
            'diastolic'     => $this->smallInteger()->notNull()->comment('ДАД, мм рт. ст.'),
            'pulse'         => $this->smallInteger()->notNull()->comment('ЧСС, уд/мин'),
            'created_at'    => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'UNIQUE KEY uk_record_measurement_position (series_id, position)',
            'CONSTRAINT fk_record_measurement_series FOREIGN KEY (series_id) REFERENCES {{%record_series}} (id) ON DELETE CASCADE',
        ], self::TABLE_OPTIONS);
    }

    public function safeDown(): void
    {
        $this->dropTable('{{%record_measurement}}');
        $this->dropTable('{{%record_series}}');
    }
}
