import { useMemo, useState, type FormEvent } from 'react';
import { Icon, Button, Card, Checkbox, TextArea, TextInput } from '@gravity-ui/uikit';
import { errorMessage, request } from '../lib/api';
import type { Device, Slot } from '../types';
import { Xmark } from '@gravity-ui/icons';

interface Props {
  open: boolean;
  devices: Device[];
  onClose: () => void;
  onSaved: () => void;
}

interface Reading { systolic: string; diastolic: string; pulse: string }
const emptyReading = (): Reading => ({ systolic: '', diastolic: '', pulse: '' });
const symptoms = [
  ['headache', 'Головная боль'], ['weakness', 'Слабость'], ['drowsiness', 'Сонливость'],
  ['dizziness', 'Головокружение'], ['nausea', 'Тошнота'], ['palpitations', 'Сердцебиение'],
  ['chest_discomfort', 'Дискомфорт в груди'], ['shortness_of_breath', 'Одышка'], ['other', 'Другое'],
] as const;

export default function MeasurementModal({ open, devices, onClose, onSaved }: Props) {
  const [readings, setReadings] = useState<Reading[]>([emptyReading(), emptyReading(), emptyReading()]);
  const [slot, setSlot] = useState<Slot>('morning');
  const [deviceId, setDeviceId] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const needsThird = useMemo(() => {
    const first = readings[0]; const second = readings[1];
    if (!first.systolic || !first.diastolic || !second.systolic || !second.diastolic) return false;
    return Math.max(
      Math.abs(Number(first.systolic) - Number(second.systolic)),
      Math.abs(Number(first.diastolic) - Number(second.diastolic)),
    ) > 10;
  }, [readings]);

  if (!open) return null;

  function updateReading(index: number, field: keyof Reading, value: string) {
    setReadings((current) => current.map((reading, readingIndex) => readingIndex === index ? { ...reading, [field]: value } : reading));
  }

  function toggleSymptom(code: string, checked: boolean) {
    setSelectedSymptoms((current) => checked ? [...current, code] : current.filter((item) => item !== code));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const count = needsThird ? 3 : 2;
    const current = readings.slice(0, count);
    if (current.some((reading) => !reading.systolic || !reading.diastolic || !reading.pulse)) {
      setError(needsThird ? 'Заполните все три измерения: разница первых двух больше 10 мм рт. ст.' : 'Заполните все поля двух измерений.');
      return;
    }
    const parsed = current.map((reading) => ({ systolic: Number(reading.systolic), diastolic: Number(reading.diastolic), pulse: Number(reading.pulse) }));
    if (parsed.some((reading) => reading.systolic <= reading.diastolic)) {
      setError('Верхнее давление должно быть выше нижнего. Проверьте значения.');
      return;
    }
    setLoading(true);
    try {
      await request('/api/records/create', {
        method: 'POST',
        body: JSON.stringify({
          slot,
          is_planned: slot !== 'unscheduled',
          device_id: deviceId || null,
          measurements: parsed,
          notes,
          symptoms: selectedSymptoms,
        }),
      });
      setReadings([emptyReading(), emptyReading(), emptyReading()]);
      setNotes(''); setSelectedSymptoms([]); setDeviceId(''); setSlot('morning');
      onSaved(); onClose();
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <Card className="measurement-modal" role="dialog" aria-modal="true" aria-labelledby="measurement-title">
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Новая запись</span>
            <h2 id="measurement-title">Замер давления</h2>
            <p>Проводите измерения сидя после пяти минут покоя. Интервал — 1–2 минуты.</p>
          </div>
          <button className="modal-close" onClick={onClose} aria-label="Закрыть">
            <Icon data={Xmark} />
          </button>
        </div>
        <form onSubmit={submit} className="measurement-form">
          <div className="measurement-context">
            <label>Время измерения<select value={slot} onChange={(event) => setSlot(event.target.value as Slot)}><option value="morning">Утро</option><option value="day">День</option><option value="evening">Вечер</option><option value="unscheduled">Вне плана</option></select></label>
            <label>Тонометр<select value={deviceId} onChange={(event) => setDeviceId(event.target.value)}><option value="">Не выбран</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.title}</option>)}</select></label>
          </div>
          <div className="readings-heading"><h3>Показания серии</h3></div>
          {[0, 1].map((index) => <ReadingFields key={index} index={index} reading={readings[index]} update={updateReading} />)}
          {needsThird && <>
            <div className="third-reading-note"><strong>Нужен третий замер</strong><span>Разница между первыми двумя показаниями слишком большая. Сделайте ещё одно измерение через 1–2 минуты, чтобы точнее оценить серию.</span></div>
            <ReadingFields index={2} reading={readings[2]} update={updateReading} />
          </>}
          <div className="measurement-extra"><div className="readings-heading"><h3>Самочувствие</h3></div>
            <TextArea value={notes} onUpdate={setNotes} placeholder="Опишите общее состояние, обстоятельства или жалобы…" rows={3} />
            <div className="symptom-grid">{symptoms.map(([code, label]) => <Checkbox key={code} checked={selectedSymptoms.includes(code)} onUpdate={(checked) => toggleSymptom(code, checked)}>{label}</Checkbox>)}</div>
          </div>
          {error && <div className="form-error">{error}</div>}
          <div className="modal-actions"><Button view="flat" size="xl" onClick={onClose} type="button">Отмена</Button><Button view="action" size="xl" type="submit" loading={loading}>Сохранить серию</Button></div>
        </form>
      </Card>
    </div>
  );
}

function ReadingFields({ index, reading, update }: { index: number; reading: Reading; update: (index: number, field: keyof Reading, value: string) => void }) {
  return <div className="reading-row md:grid-cols-3">
    <div className="reading-number">{index + 1}</div>
    <div className="reading-caption">{index + 1}-й замер</div>
    <label>Верхнее (САД)
      <TextInput 
        value={reading.systolic} 
        onUpdate={(value) => update(index, 'systolic', value)} 
        type="number"
        size="l" 
        placeholder="120" 
      />
    </label>
    <label>Нижнее (ДАД)
      <TextInput 
        value={reading.diastolic} 
        onUpdate={(value) => update(index, 'diastolic', value)} 
        type="number" 
        size="l" 
        placeholder="80" 
      />
    </label>
    <label>Пульс
      <TextInput 
        value={reading.pulse} 
        onUpdate={(value) => update(index, 'pulse', value)} 
        type="number" 
        size="l" 
        placeholder="70" 
      />
    </label>
  </div>;
}
