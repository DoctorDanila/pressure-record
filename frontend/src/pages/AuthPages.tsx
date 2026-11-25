import { useState, type FormEvent } from 'react';
import { Icon, Checkbox, Button, Card, TextInput } from '@gravity-ui/uikit';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, errorMessage, request } from '../lib/api';
import { useAuth } from '../components/AppShell';
import { TriangleExclamation, HandOk, Stopwatch } from '@gravity-ui/icons';

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await request<{ id: number; email: string; email_verified: boolean }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify({ email, password }),
      });
      setUser(user);
      navigate('/app');
    } catch (caught) {
      setError(errorMessage(caught));
      if (caught instanceof ApiError && caught.status === 401) setError('Не удалось войти. Проверьте email и пароль.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page container">
      <div className="auth-aside auth-aside-blue h-full"><h1>Ваши измерения — ваша история</h1><p>Сохраняйте исходные данные, наблюдайте динамику и делитесь результатами с врачом</p><div className="auth-aside-graphic"><span className='p-1'>САД</span><strong>128</strong><div className="auth-sparkline">{[24, 38, 31, 54, 42, 66, 55, 72, 61, 83, 68].map((v, i) => <b key={i} style={{ height: `${v}%` }} />)}</div></div></div>
      <Card className="auth-card h-full">
        <span className="eyebrow">С возвращением</span><h2>Войти в аккаунт</h2><p className="auth-muted">Продолжите вести дневник измерений</p>
        <form onSubmit={submit} className="auth-form">
          <label>Электронная почта<TextInput value={email} onUpdate={setEmail} type="email" placeholder="you@example.com" size="xl" autoComplete="Электронная почта" /></label>
          <label>Пароль<TextInput value={password} onUpdate={setPassword} type="password" placeholder="Ваш пароль" size="xl" autoComplete="current-password" /></label>
          {error && <div className="form-error">{error}</div>}
          <Button view="action" size="xl" type="submit" loading={loading} width="max">Войти</Button>
        </form>
        <div className="auth-bottom">Ещё нет аккаунта? <Link to="/register">Зарегистрироваться</Link></div>
        <p className="auth-disclaimer flex items-center justify-center gap-1">
          <Icon data={TriangleExclamation} size={12}/>
          Cервис не заменяет врача
        </p>
      </Card>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [consent, setConsent] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    if (password !== repeat) { setError('Пароли не совпадают.'); return; }
    const policy = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,}$/;
    if (!policy.test(password)) {
      setError('Пароль должен содержать латинские строчные и заглавные буквы, цифру и спецсимвол (@$!%*?&).');
      return;
    }
    if (!consent) {
      setError('Необходимо согласие с политикой конфиденциальности и лицензионным соглашением.');
      return;
    }
    setLoading(true);
    try {
      await request('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      setDone(true);
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return <div className="auth-page container"><Card className="auth-card auth-success-card"><div className="success-icon"><Icon data={Stopwatch}/></div><span className="eyebrow">Почти готово</span><h2>Проверьте почту</h2><p>Мы отправили письмо со ссылкой для подтверждения на <strong>{email}</strong>. Перейдите по ней, чтобы активировать аккаунт.</p><p className="auth-muted">Письмо не пришло? Проверьте папку «Спам» или напишите в поддержку.</p><Button view="action" size="xl" onClick={() => navigate('/login')}>Перейти ко входу</Button></Card></div>;
  }

  return (
    <div className="auth-page container">
      <div className="auth-aside auth-aside-green h-full"><h1>Зарегистрируйтесь сейчас — сохраните бесплатный доступ</h1><p>В дальнейшем сервис станет платным для новых аккаунтов. Ранняя регистрация закрепит бесплатный тариф.</p><div className="early-badge"><span><Icon data={HandOk}/></span><div><strong>Бесплатно для ранних пользователей</strong><small>Без ограничений по времени</small></div></div></div>
      <Card className="auth-card h-full">
        <span className="eyebrow">Создайте аккаунт</span><h2>Регистрация</h2><p className="auth-muted">Это займёт меньше минуты.</p>
        <form onSubmit={submit} className="auth-form">
          <label>Email<TextInput value={email} onUpdate={setEmail} type="email" placeholder="you@example.com" size="xl" autoComplete="email" /></label>
          <label>Пароль<TextInput value={password} onUpdate={setPassword} type="password" placeholder="Придумайте пароль" size="xl" autoComplete="new-password" /></label>
          <label>Повторите пароль<TextInput value={repeat} onUpdate={setRepeat} type="password" placeholder="Ещё раз пароль" size="xl" autoComplete="new-password" /></label>
          <p className="password-hint">Не менее 6 символов: латинские буквы в разных регистрах, цифра и спецсимвол.</p>
          <Checkbox
            name="consent"
            key="consent"
            checked={consent}
            onUpdate={setConsent}
            className="flex!"
          >
            Я согласен с{' '}
              <Link to="/policy" className="nav-login text-[#367fdb]!">«Политикой конфиденциальности»</Link><br/>
            и согласен с{' '}
              <Link to="/policy" className="nav-login text-[#367fdb]!">«Лицензионным соглашением»</Link>{' '}
              сервиса
          </Checkbox>
          {error && <div className="form-error">{error}</div>}
          <Button view="action" size="xl" type="submit" loading={loading} disabled={!consent} width="max">Создать аккаунт</Button>
        </form>
        <div className="auth-bottom">Уже зарегистрированы? <Link to="/login">Войти</Link></div>
        <p className="auth-disclaimer flex items-center justify-center gap-1">
          <Icon data={TriangleExclamation} size={12}/>
          Cервис не заменяет врача
        </p>
      </Card>
    </div>
  );
}
