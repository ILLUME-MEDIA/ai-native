import { useRoutes } from 'react-router';
import { routes } from '@admin/routes';
const App = () => {
  return useRoutes(routes);
};
export default App;