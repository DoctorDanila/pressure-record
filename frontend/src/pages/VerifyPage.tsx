import { useEffect, useState } from 'react';
import { Button, Card, Icon } from '@gravity-ui/uikit';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { errorMessage, request } from '../lib/api';
import { TriangleExclamation, HandOk } from '@gravity-ui/icons';

type Status = 'loading' | 'success' | 'error' | 'missing';

export default function VerifyPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id');
  const token = params.get('token');
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Подтверждаем адрес электронной почты…');

  useEffect(() => {
    if (!id || !token) {
      setStatus('missing');
      setMessage('В ссылке не хватает параметров подтверждения.');
      return;
    }

    let active = true;
    request(`/api/auth/verify-email?id=${encodeURIComponent(id)}&token=${encodeURIComponent(token)}`)
      .then(() => {
        if (active) {
          setStatus('success');
          setMessage('Адрес электронной почты подтверждён. Теперь можно войти в аккаунт.');
        }
      })
      .catch((error) => {
        if (active) {
          setStatus('error');
          setMessage(errorMessage(error));
        }
      });

    return () => {
      active = false;
    };
  }, [id, token]);

  return (
    <div className="center-page container">
      <Card className="verify-card">
        <div className={`verify-symbol ${status}`}>
          {status === 'loading' ? (
            <span className="spinner" />
          ) : status === 'success' ? (
            <Icon data={HandOk} size={19} />
          ) : (
            <Icon data={TriangleExclamation} size={19} />
          )}
        </div>
        <span className="eyebrow">Подтверждение email</span>
        <h1>
          {status === 'success'
            ? 'Всё готово'
            : status === 'loading'
              ? 'Минутку…'
              : 'Не получилось подтвердить'}
        </h1>
        <p className='p-2'>{message}</p>
        {status === 'success' ? (
          <Button view="action" size="xl" onClick={() => navigate('/login')}>
            Перейти ко входу
          </Button>
        ) : status !== 'loading' ? (
          <div className="verify-actions">
            <Link to="/">На главную</Link>
            <a href="mailto:support@thescript.agency">Связаться с поддержкой</a>
          </div>
        ) : null}
      </Card>
    </div>
  );
}
