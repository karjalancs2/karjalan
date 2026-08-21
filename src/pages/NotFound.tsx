import { useTranslation } from '../contexts/TranslationContext';
import { Link } from 'react-router-dom';

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24">
      <h1 className="text-4xl font-bold mb-4">404</h1>
      <p className="text-neutral-400 mb-8">Sivua ei löytynyt.</p>
      <Link to="/" className="text-white bg-neutral-800 px-6 py-2 rounded hover:bg-neutral-700">
        {t('nav.home')}
      </Link>
    </div>
  );
}
