import DT from 'datatables.net-bs5';
import DataTable from 'datatables.net-react';
import 'datatables.net-responsive';
import { useRef, useState } from 'react';
import { Dropdown, DropdownItem, DropdownMenu, DropdownToggle, FormCheck } from 'react-bootstrap';
import { columns, paginationIcons, tableData } from '../../data';
const columnLabels = ['Company', 'Symbol', 'Price', 'Change', 'Volume', 'Market Cap', 'Rating', 'Status'];
const Table = () => {
  DataTable.use(DT);
  const tableRef = useRef(null);
  const [visibleColumns, setVisibleColumns] = useState(() => new Array(columnLabels.length).fill(true));
  const handleColumnToggle = index => {
    if (tableRef.current) {
      const column = tableRef.current.dt()?.column(index);
      const currentVisible = column?.visible();
      column?.visible(!currentVisible);
      setVisibleColumns(prev => {
        const updated = [...prev];
        updated[index] = !currentVisible;
        return updated;
      });
    }
  };
  return <>
      <Dropdown autoClose="outside" className="mb-3">
        <DropdownToggle variant="secondary" size="sm">
          Show/Hide Columns
        </DropdownToggle>

        <DropdownMenu className="p-2 border shadow-sm">
          {columnLabels.map((label, index) => <DropdownItem key={index} as="div" className="px-0">
              <FormCheck type="checkbox" id={`colToggle${index}`} label={label} checked={visibleColumns[index]} onChange={() => handleColumnToggle(index)} className="ms-2" />
            </DropdownItem>)}
        </DropdownMenu>
      </Dropdown>

      <DataTable ref={tableRef} data={tableData.body} columns={columns} options={{
      responsive: true,
      language: {
        paginate: paginationIcons
      }
    }} className="table table-striped dt-responsive align-middle mb-0">
        <thead className="thead-sm text-uppercase fs-xxs">
          <tr>
            {tableData.header.map((label, idx) => <th key={idx}>{label}</th>)}
          </tr>
        </thead>
      </DataTable>
    </>;
};
export default Table;