import { Link } from 'react-router';
import { META_DATA } from '@admin/config/constants';
import PageMetaData from './PageMetaData';

const PageBreadcrumb = ({ title, subtitle, homeTo = '/' }) => {
  return (
    <>
      <PageMetaData title={title} />
      <div className="page-title-head d-flex align-items-center justify-content-between mb-3">
        <div className="flex-grow-1">
          <h4 className="page-main-title m-0">{title}</h4>
        </div>
        <div className="text-end">
          <ol className="breadcrumb m-0 py-0">
            <li className="breadcrumb-item">
              <Link to={homeTo}>{META_DATA.name}</Link>
            </li>
            {subtitle && (
              <li className="breadcrumb-item">
                <span>{subtitle}</span>
              </li>
            )}
            <li className="breadcrumb-item active" aria-current="page">
              {title}
            </li>
          </ol>
        </div>
      </div>
    </>
  );
};

export default PageBreadcrumb;
