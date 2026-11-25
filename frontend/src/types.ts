export type Slot = 'morning' | 'day' | 'evening' | 'unscheduled';
export type Category = 'low' | 'normal' | 'high';

export interface User {
  id: number;
  email: string;
  email_verified: boolean;
}

export interface Measurement {
  position: number;
  systolic: number;
  diastolic: number;
  pulse: number;
}

export interface RecordItem {
  id: number;
  measured_at: string;
  slot: Slot;
  is_planned: boolean;
  device_id: number | null;
  notes: string | null;
  symptoms: string[];
  settings_snapshot: Record<string, number | boolean>;
  measurements: Measurement[];
  quality_flag: boolean;
  metrics: {
    measurement_count: number;
    quality_flag: boolean;
    ranges: { systolic: number; diastolic: number; pulse: number };
    mean: { systolic: number; diastolic: number; pulse: number };
    median: { systolic: number; diastolic: number; pulse: number };
    point: { systolic: number; diastolic: number; pulse: number };
    pulse_pressure: number;
    map: number;
    category: Category;
  };
}

export interface Device {
  id: number;
  title: string;
  cuff_type: 'shoulder' | 'wrist';
  model: string | null;
  calibration_date: string | null;
  created_at?: string;
}

export interface UserConfig {
  systolic_high: number;
  diastolic_high: number;
  systolic_low: number;
  diastolic_low: number;
  exclude_first_day: boolean;
}

export interface Dashboard {
  summary: {
    series_count: number;
    planned_series_count: number;
    unscheduled_series_count: number;
    included_series_count: number;
    average_systolic: number | null;
    average_diastolic: number | null;
    average_pulse: number | null;
    time_in_target_percent: number | null;
    systolic_sd: number | null;
    systolic_cv: number | null;
    diastolic_sd: number | null;
    diastolic_cv: number | null;
    trend_systolic_per_week: number | null;
    trend_diastolic_per_week: number | null;
    trend_available: boolean;
    excluded_first_day: string | null;
    consecutive_outside_target: number;
  };
  timeseries: Array<{
    id: number;
    date: string;
    measured_at: string;
    slot: Slot;
    is_planned: boolean;
    systolic: number;
    diastolic: number;
    pulse: number;
    pulse_pressure: number;
    map: number;
    planned_systolic: number | null;
    planned_diastolic: number | null;
    unscheduled_systolic: number | null;
    unscheduled_diastolic: number | null;
    rolling_systolic_7d: number | null;
    rolling_diastolic_7d: number | null;
    category: Category;
    quality_flag: boolean;
  }>;
  weekly: Array<{ week: string; normal: number; low: number; high: number; total: number }>;
  heatmap: Array<{ date: string; morning: HeatCell | null; day: HeatCell | null; evening: HeatCell | null }>;
  distribution: Array<{ range: string; count: number }>;
  records: RecordItem[];
  method: { excluded_first_day: boolean; excluded_date: string | null; trend_minimum_series: number; timezone: string; disclaimer: string };
}

export interface HeatCell {
  category: Category;
  planned: boolean;
  quality_flag: boolean;
  id: number;
}
