import { Link } from 'react-router-dom';
import { EmptyState } from '../components/EmptyState';

export default function NotFoundPage() {
  return (
    <div className="page">
      <div className="container" style={{ maxWidth: '640px' }}>
        <EmptyState
          title="Page not found"
          action={
            <Link className="btn btn-primary" to="/">
              Back to the catalog
            </Link>
          }
        >
          The page you followed does not exist in this build.
        </EmptyState>
      </div>
    </div>
  );
}
