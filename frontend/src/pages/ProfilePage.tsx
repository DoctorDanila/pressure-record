import { useEffect, useState, type FormEvent } from 'react';
import { Button, Card, Checkbox, TextInput, Icon } from '@gravity-ui/uikit';
import { errorMessage, request } from '../lib/api';
import type { Device, UserConfig } from '../types';
import { useAuth } from '../components/AppShell';
import { Pulse, Gear, Circle, CircleFill, TrashBin, Plus } from '@gravity-ui/icons';

const defaults: UserConfig = {
  systolic_high: 135,
  diastolic_high: 85,
  systolic_low: 90,
  diastolic_low: 60,
  exclude_first_day: true,
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [config, setConfig] = useState<UserConfig>(defaults);
  const [devices, setDevices] = useState<Device[]>([]);
  const [title, setTitle] = useState('');
  const [model, setModel] = useState('');
  const [cuffType, setCuffType] = useState<'shoulder' | 'wrist'>('shoulder');
  const [calibrationDate, setCalibrationDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const data = await request<{ config: UserConfig; devices: Device[] }>('/api/settings');
      setConfig({ ...defaults, ...data.config });
      setDevices(data.devices ?? []);
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  function setNumber(field: 'systolic_high' | 'diastolic_high' | 'systolic_low' | 'diastolic_low', value: string) {
    setConfig((current) => ({ ...current, [field]: value === '' ? 0 : Number(value) }));
  }

  async function saveConfig(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError(''); setNotice('');
    try {
      const data = await request<{ config: UserConfig; devices: Device[] }>('/api/settings/update', {
        method: 'PUT', body: JSON.stringify(config),
      });
      setConfig({ ...defaults, ...data.config });
      setNotice('Настройки сохранены. Новые серии будут классифицироваться по этим порогам.');
    } catch (caught) { setError(errorMessage(caught)); }
    finally { setSaving(false); }
  }

  async function createDevice(event: FormEvent) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      await request('/api/devices/create', {
        method: 'POST',
        body: JSON.stringify({ title, model, cuff_type: cuffType, calibration_date: calibrationDate || null }),
      });
      setTitle(''); setModel(''); setCalibrationDate(''); setCuffType('shoulder');
      await load(); setNotice('Тонометр добавлен.');
    } catch (caught) { setError(errorMessage(caught)); }
  }

  async function deleteDevice(id: number) {
    if (!window.confirm('Удалить этот тонометр из справочника?')) return;
    setError(''); setNotice('');
    try {
      await request(`/api/devices/${id}/delete`, { method: 'DELETE' });
      await load(); setNotice('Тонометр удалён. Сами измерения останутся в истории.');
    } catch (caught) { setError(errorMessage(caught)); }
  }

  return (
    <div className="profile-page container">
      <div className="dashboard-heading"><div><h1 className='py-2'>Профиль и настройки</h1><p>Настройте индивидуальные пороги и добавьте используемые тонометры</p></div></div>
      <Card className="profile-user-card"><div className="avatar-circle">{user?.email.slice(0, 1).toUpperCase()}</div><div><span className="profile-label">Аккаунт</span><strong>{user?.email}</strong><small>{user?.email_verified ? 'Email подтверждён' : 'Email ещё не подтверждён'}</small></div></Card>
      {error && <div className="inline-error">{error}</div>}{notice && <div className="inline-success">{notice}</div>}
      {loading ? <div className="dashboard-loading"><span className="spinner" /> Загружаем настройки…</div> : <>
        <Card className="profile-section-card">
          <div className="profile-section-heading"><div><h2>Пороговые значения</h2><p>Ваши пороги по умолчанию: 135/85<br/>Индивидуальные значения согласуйте с врачом</p></div><span className="settings-icon"><Icon data={Gear} /></span></div>
          <form onSubmit={saveConfig}>
            <div className="threshold-grid">
              <div className="threshold-panel"><h3>Верхние границы</h3><p>При достижении любого из значений серия отмечается как завышенная</p><label>САД — верхнее давление<TextInput type="number" size="xl" value={String(config.systolic_high)} onUpdate={(value) => setNumber('systolic_high', value)} /></label><label>ДАД — нижнее давление<TextInput type="number" size="xl" value={String(config.diastolic_high)} onUpdate={(value) => setNumber('diastolic_high', value)} /></label></div>
              <div className="threshold-panel"><h3>Нижние границы</h3><p>Значения ниже нижних порогов отмечаются как заниженные</p><label>САД — верхнее давление<TextInput type="number" size="xl" value={String(config.systolic_low)} onUpdate={(value) => setNumber('systolic_low', value)} /></label><label>ДАД — нижнее давление<TextInput type="number" size="xl" value={String(config.diastolic_low)} onUpdate={(value) => setNumber('diastolic_low', value)} /></label></div>
            </div>
            <div className="settings-option"><Checkbox className='flex!' checked={config.exclude_first_day} onUpdate={(checked) => setConfig((current) => ({ ...current, exclude_first_day: checked }))}><strong>Исключать первый день из расчёта средних</strong>{" "}<span>Исходные данные первого дня сохраняются</span></Checkbox></div>
            <div className="settings-actions"><Button view="action" size="xl" type="submit" loading={saving}>Сохранить настройки</Button></div>
          </form>
        </Card>

        <Card className="profile-section-card">
          <div className="profile-section-heading"><div><span className="eyebrow">Мои устройства</span><h2>Тонометры</h2><p>Для удобства можно добавить своё устройство(тонометр)</p></div><span className="settings-icon"><Icon data={Pulse} /></span></div>
          <div className="device-list">{devices.length ? devices.map((device) => <div className="device-row" key={device.id}><div className="device-symbol">{device.cuff_type === 'wrist' ? <Icon data={CircleFill} /> : <Icon data={Circle} />}</div><div className="device-description"><strong>{device.title}</strong><span>{device.model || (device.cuff_type === 'wrist' ? 'Запястный' : 'Плечевой')} {device.calibration_date ? `· калибровка ${device.calibration_date}` : ''}</span></div><button className="delete-device" onClick={() => void deleteDevice(device.id)}><Icon data={TrashBin} /></button></div>) : <div className="device-empty">Тонометры пока не добавлены.</div>}</div>
          <form className="device-form"
                onSubmit={createDevice}
          >
            <h3>Добавить тонометр</h3>
            <div className="device-form-grid">
              <label>Название
                <TextInput
                    value={title}
                    onUpdate={setTitle}
                    placeholder="Например, Домашний тонометр"
                    size="l"
                />
              </label>
              <label>Модель
                <TextInput
                    value={model}
                    onUpdate={setModel}
                    placeholder="Производитель и модель"
                    size="l"
                />
              </label>
              <label>Тип манжеты
                <select
                    value={cuffType}
                    onChange={
                  (event) => setCuffType(event.target.value as 'shoulder' | 'wrist')
                }>
                  <option value="shoulder">Плечевой</option>
                  <option value="wrist">Запястный</option>
                </select>
              </label>
              <label>Дата калибровки
                <input type="date" value={calibrationDate} onChange={(event) => setCalibrationDate(event.target.value)} />
              </label>
            </div>
            <Button view="outlined" size="l" type="submit"><Icon data={Plus} /> Добавить прибор</Button>
          </form>
        </Card>
        <div className="profile-info">
          <strong>Как используются пороги</strong>
          <p>
            Категория определяется по среднему значению серии (или по медиане для низкодостоверной серии)<br/>
            Сохраняемый снимок порогов позволяет восстановить, по каким настройкам были построены прошлые результаты<br/>
            Новые настройки применяются к новым сериям</p>
        </div>
      </>}
    </div>
  );
}
