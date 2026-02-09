import user1 from '@admin/assets/images/users/user-1.jpg';
import { yupResolver } from '@hookform/resolvers/yup';
import { createContext, startTransition, useCallback, useContext, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
const KanbanContext = createContext(undefined);
export const kanbanTaskSchema = yup.object({
  title: yup.string().required('Task title is required'),
  assignee: yup.mixed().required('Please select an assignee'),
  priority: yup.string().oneOf(['normal', 'medium', 'high', 'urgent']).required('Please select priority'),
  description: yup.string().nullable().optional()
});
export const kanbanSectionSchema = yup.object({
  sectionTitle: yup.string().required('Section title is required')
});
const useKanbanContext = () => {
  const context = useContext(KanbanContext);
  if (!context) {
    throw new Error('useKanbanContext can only be used within KanbanProvider');
  }
  return context;
};
const KanbanProvider = ({
  children,
  tasksData,
  sectionsData
}) => {
  const [sections, setSections] = useState(sectionsData);
  const [tasks, setTasks] = useState(tasksData);
  const [activeSectionId, setActiveSectionId] = useState();
  const [activeTaskId, setActiveTaskId] = useState();
  const [taskFormData, setTaskFormData] = useState();
  const [sectionFormData, setSectionFormData] = useState();
  const [dialogStates, setDialogStates] = useState({
    showNewTaskModal: false,
    showSectionModal: false
  });
  const {
    control: newTaskControl,
    handleSubmit: newTaskHandleSubmit,
    reset: newTaskReset
  } = useForm({
    resolver: yupResolver(kanbanTaskSchema)
  });
  const {
    control: sectionControl,
    handleSubmit: sectionHandleSubmit,
    reset: sectionReset
  } = useForm({
    resolver: yupResolver(kanbanSectionSchema)
  });
  const emptySectionForm = useCallback(() => {
    sectionReset({
      sectionTitle: ''
    });
  }, [sectionReset]);
  const emptyTaskForm = useCallback(() => {
    newTaskReset({
      title: undefined,
      assignee: undefined,
      description: undefined,
      priority: undefined
    });
  }, [newTaskReset]);
  const toggleNewTaskModal = (sectionId, taskId) => {
    if (sectionId) setActiveSectionId(sectionId);
    if (taskId) {
      const foundTask = tasks.find(task => task.id === taskId);
      if (foundTask) {
        newTaskReset({
          title: foundTask.title,
          assignee: foundTask.assignee,
          priority: foundTask.priority
        });
        startTransition(() => {
          setActiveTaskId(taskId);
        });
        startTransition(() => {
          setTaskFormData(foundTask);
        });
      }
    }
    if (dialogStates.showNewTaskModal) emptyTaskForm();
    startTransition(() => {
      setDialogStates({
        ...dialogStates,
        showNewTaskModal: !dialogStates.showNewTaskModal
      });
    });
  };
  const toggleSectionModal = sectionId => {
    if (sectionId) {
      const foundSection = sections.find(section => section.id === sectionId);
      if (foundSection) {
        startTransition(() => {
          setSectionFormData(foundSection);
        });
        startTransition(() => {
          setActiveSectionId(foundSection.id);
        });
        sectionReset({
          sectionTitle: foundSection.title
        });
      }
    }
    if (dialogStates.showSectionModal) emptySectionForm();
    startTransition(() => {
      setDialogStates({
        ...dialogStates,
        showSectionModal: !dialogStates.showSectionModal
      });
    });
  };
  const getAllTasksPerSection = useCallback(id => {
    return tasks.filter(task => task.sectionId == id);
  }, [tasks]);
  const handleNewTask = newTaskHandleSubmit(values => {
    const formData = {
      title: values.title,
      assignee: values.assignee,
      priority: values.priority
    };
    if (activeSectionId) {
      const newTask = {
        ...formData,
        title: formData.title,
        assignee: {
          image: formData.assignee.image ?? user1,
          name: formData.assignee.name
        },
        stats: {
          task: 5,
          time: '1 days',
          link: 3,
          messages: 8
        },
        priority: formData.priority,
        status: taskFormData?.status || 'todo',
        sectionId: activeSectionId,
        id: Number(tasks.slice(-1)[0].id) + 1 + ''
      };
      setTasks([...tasks, newTask]);
    }
    startTransition(() => {
      toggleNewTaskModal();
    });
    setActiveSectionId(undefined);
    newTaskReset();
  });
  const handleEditTask = newTaskHandleSubmit(values => {
    const formData = {
      title: values.title,
      assignee: values.assignee,
      priority: values.priority
    };
    if (activeSectionId && activeTaskId) {
      const newTask = {
        ...formData,
        title: formData.title,
        stats: {
          task: 5,
          time: '1 days',
          link: 3,
          messages: 8
        },
        assignee: {
          image: formData.assignee.image ?? user1,
          name: formData.assignee.name
        },
        priority: formData.priority,
        sectionId: activeSectionId,
        status: taskFormData?.status || 'todo',
        id: activeTaskId
      };
      setTasks(tasks.map(t => t.id === activeTaskId ? newTask : t));
    }
    startTransition(() => {
      toggleNewTaskModal();
    });
    startTransition(() => {
      setActiveSectionId(undefined);
    });
    startTransition(() => {
      newTaskReset();
    });
    startTransition(() => {
      setTaskFormData(undefined);
    });
  });
  const handleDeleteTask = taskId => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };
  const onDragEnd = result => {
    const {
      destination,
      draggableId
    } = result;
    if (!destination) return;
    const taskIndex = tasks.findIndex(task => String(task.id) === String(draggableId));
    if (taskIndex === -1) return;
    const task = tasks[taskIndex];
    let newTasks = tasks.filter(t => String(t.id) !== String(draggableId));
    const updatedTask = {
      ...task,
      sectionId: destination.droppableId
    };
    let destIdx = 0;
    let count = 0;
    for (let i = 0; i < newTasks.length; i++) {
      if (newTasks[i].sectionId === destination.droppableId) {
        if (count === destination.index) {
          destIdx = i;
          break;
        }
        count++;
      }
      if (i === newTasks.length - 1) {
        destIdx = newTasks.length;
      }
    }
    newTasks = [...newTasks.slice(0, destIdx), updatedTask, ...newTasks.slice(destIdx)];
    setTasks(newTasks);
  };
  const handleNewSection = sectionHandleSubmit(values => {
    const section = {
      // TODO test, test when array is empty
      id: Number(sections.slice(-1)[0].id) + 1 + '',
      title: values.sectionTitle
    };
    setSections([...sections, section]);
    startTransition(() => {
      toggleSectionModal();
    });
    sectionReset();
  });
  const handleEditSection = sectionHandleSubmit(values => {
    if (activeSectionId) {
      const newSection = {
        id: activeSectionId,
        title: values.sectionTitle
      };
      setSections(sections.map(section => {
        return section.id === activeSectionId ? newSection : section;
      }));
    }
    startTransition(() => {
      toggleSectionModal();
    });
    sectionReset();
  });
  const handleDeleteSection = sectionId => {
    setSections(sections.filter(section => section.id !== sectionId));
  };
  return <KanbanContext.Provider value={useMemo(() => ({
    sections,
    activeSectionId,
    taskFormData,
    sectionFormData,
    newTaskModal: {
      open: dialogStates.showNewTaskModal,
      toggle: toggleNewTaskModal
    },
    sectionModal: {
      open: dialogStates.showSectionModal,
      toggle: toggleSectionModal
    },
    taskForm: {
      control: newTaskControl,
      newRecord: handleNewTask,
      editRecord: handleEditTask,
      deleteRecord: handleDeleteTask
    },
    sectionForm: {
      control: sectionControl,
      newRecord: handleNewSection,
      editRecord: handleEditSection,
      deleteRecord: handleDeleteSection
    },
    getAllTasksPerSection,
    onDragEnd
  }), [sections, activeSectionId, taskFormData, sectionFormData, dialogStates, toggleNewTaskModal, toggleSectionModal, newTaskControl, handleNewTask, handleEditTask, handleDeleteTask, sectionControl, handleNewSection, handleEditSection, handleDeleteSection, getAllTasksPerSection, onDragEnd])}>
      {children}
    </KanbanContext.Provider>;
};
export { KanbanProvider, useKanbanContext };
