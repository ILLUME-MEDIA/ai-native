import { Icon as IconifyIcon } from '@iconify/react';
import { Card, CardBody, CardHeader, CardTitle, FormControl } from 'react-bootstrap';
const Search = () => {
  return <>
      <Card>
        <CardHeader>
          <CardTitle as="h4">Search</CardTitle>
        </CardHeader>
        <CardBody>
          <h5 className="fs-14 fw-semibold">Sizes</h5>
          <div className="app-search app-search-sm">
            <FormControl type="text" className="form-control-sm" placeholder="Search here..." />
            <IconifyIcon icon="lucide:search" className="app-search-icon text-muted" />
          </div>
          <div className="app-search mt-3">
            <FormControl type="text" placeholder="Search something here..." />
            <IconifyIcon icon="lucide:search" className="app-search-icon text-muted" />
          </div>
          <div className="app-search app-search-lg mt-3">
            <FormControl type="text" className="form-control-lg" placeholder="Search here..." />
            <IconifyIcon icon="lucide:search" className="app-search-icon text-muted" />
          </div>
          <h5 className="fs-14 fw-semibold mt-3">Styles</h5>
          <div className="app-search">
            <FormControl type="text" placeholder="Search something here..." />
            <IconifyIcon icon="solar:magic-stick-3-bold-duotone" className="app-search-icon text-secondary fs-18" />
          </div>
          <div className="app-search input-group mt-3">
            <FormControl type="text" placeholder="Search here..." />
            <IconifyIcon icon="lucide:search" className="app-search-icon text-muted" />
            <button className="btn btn-secondary" type="button">
              Search
            </button>
          </div>
          <div className="app-search mt-3">
            <FormControl type="text" className="border-light bg-body" placeholder="Search something here..." />
            <IconifyIcon icon="lucide:search" className="app-search-icon text-muted" />
          </div>
        </CardBody>
      </Card>
    </>;
};
export default Search;