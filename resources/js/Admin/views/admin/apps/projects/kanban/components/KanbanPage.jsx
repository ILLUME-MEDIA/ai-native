import { Card } from 'react-bootstrap';
import Board from './Board';
import { kanbanSectionData, KanbanTaskData } from './data';
import KanbanHeader from './KanbanHeader';
import Modals from './Modals';
import { KanbanProvider } from './useKanbanContext';
const KanbanPage = () => {
  return <KanbanProvider sectionsData={kanbanSectionData} tasksData={KanbanTaskData}>
      <div className="outlook-box kanban-app">
        <Card className="h-100 mb-0 flex-grow-1">
          <KanbanHeader />
          <Board />
          <Modals />
        </Card>
      </div>
    </KanbanProvider>;
};
export default KanbanPage;