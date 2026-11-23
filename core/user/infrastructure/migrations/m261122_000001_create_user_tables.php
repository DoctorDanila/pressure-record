<?php

declare(strict_types=1);

namespace core\user\infrastructure\migrations;

use yii\db\Migration;

final class m261122_000001_create_user_tables extends Migration
{
    private const TABLE_OPTIONS = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci';

    public function safeUp(): void
    {
        $this->createTable('{{%user}}', [
            'id'                => $this->primaryKey(),
            'email'             => $this->string(255)->notNull()->unique(),
            'password_hash'     => $this->string(255)->notNull(),
            'token'             => $this->string(255)->null(),
            'email_verified'    => $this->boolean()->null()->defaultValue(false),
            'created_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ], self::TABLE_OPTIONS);

        // Индивидуальный конфиг порогов пользователя (согласуется с врачом).
        // Значения по умолчанию - референсные домашние: повышено >= 135/85.
        $this->createTable('{{%user_setting}}', [
            'id'                => $this->primaryKey(),
            'user_id'           => $this->integer()->notNull(),
            'systolic_high'     => $this->integer()->notNull()->defaultValue(135),
            'diastolic_high'    => $this->integer()->notNull()->defaultValue(85),
            'systolic_low'      => $this->integer()->notNull()->defaultValue(90),
            'diastolic_low'     => $this->integer()->notNull()->defaultValue(60),
            'exclude_first_day' => $this->boolean()->notNull()->defaultValue(true),
            'created_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            'UNIQUE KEY uk_user_setting_user (user_id)',
            'CONSTRAINT fk_user_setting_user FOREIGN KEY (user_id) REFERENCES {{%user}} (id) ON DELETE CASCADE',
        ], self::TABLE_OPTIONS);

        // Справочник тонометров для срезов аналитики по прибору.
        $this->createTable('{{%device}}', [
            'id'                => $this->primaryKey(),
            'user_id'           => $this->integer()->notNull(),
            'title'             => $this->string(255)->notNull(),
            'cuff_type'         => $this->string(16)->notNull()->defaultValue('shoulder')->comment("shoulder | wrist"),
            'calibration_date'  => $this->timestamp()->null(),
            'model'             => $this->string(255)->null(),
            'created_at'        => $this->timestamp()->notNull()->defaultExpression('CURRENT_TIMESTAMP'),
            'CONSTRAINT fk_device_user FOREIGN KEY (user_id) REFERENCES {{%user}} (id) ON DELETE CASCADE',
        ], self::TABLE_OPTIONS);
    }

    public function safeDown(): void
    {
        $this->dropTable('{{%device}}');
        $this->dropTable('{{%user_setting}}');
        $this->dropTable('{{%user}}');
    }
}
