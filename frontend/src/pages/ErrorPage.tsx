import { Button, Card } from '@gravity-ui/uikit';
import { useNavigate } from 'react-router-dom';

interface Props {
  code?: string;
  title?: string;
}

export default function ErrorPage({
  code = '500',
  title = 'Что-то пошло не так',
}: Props) {
  const navigate = useNavigate();

  return (
    <div className="center-page container">
      <Card className="error-card">
        <span className="error-code">{code}</span>
        <h1>{title}</h1>
        <p className='p-2'>
          Кажется, эта страница потерялась. Ничего страшного — можно вернуться на главную
          или сообщить нам о проблеме.
        </p>
        <div className="error-actions">
          <Button view="action" size="xl" onClick={() => navigate('/')}>
            На главную
          </Button>
          <a href="mailto:support@thescript.agency?subject=Pressure%20Record%20—%20ошибка">
            Написать в поддержку
          </a>
        </div>
      </Card>
    </div>
  );
}
