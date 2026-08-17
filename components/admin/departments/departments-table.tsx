import { DepartmentDto } from '@/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { DepartmentsTableRow } from './departments-table-row';

import type { HeadDoctorNameMap } from './departments.types';

type DepartmentsTableProps = {
  departments: DepartmentDto[];
  headNames: HeadDoctorNameMap;
  onEdit: (department: DepartmentDto) => void;
  onActivation: (department: DepartmentDto) => void;
  onDelete: (department: DepartmentDto) => void;
};

export function DepartmentsTable({ departments, headNames, onEdit, onActivation, onDelete }: DepartmentsTableProps) {
  return (
    /*
      The wrapper scrolls and the table refuses to go below its natural width. Without that
      floor the browser honours the 100% width instead and crushes every column — which is
      what would stack the action controls on top of each other on a phone.
    */
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Departments" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Head doctor</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {departments.map(x => (
            <DepartmentsTableRow
              key={x.departmentId}
              department={x}
              headNames={headNames}
              onEdit={onEdit}
              onActivation={onActivation}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
