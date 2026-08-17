import { UserDto } from '@/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { UsersTableRow } from './users-table-row';

import type { UsersViewer } from './users.types';

type UsersTableProps = {
  users: UserDto[];
  viewer: UsersViewer;
  onEdit: (user: UserDto) => void;
  onApproval: (user: UserDto) => void;
  onActivation: (user: UserDto) => void;
  onDelete: (user: UserDto) => void;
};

export function UsersTable({ users, viewer, onEdit, onApproval, onActivation, onDelete }: UsersTableProps) {
  return (
    /*
      The wrapper scrolls and the table refuses to go below its natural width. Without that
      floor the browser honours the 100% width instead and crushes every column — which is
      what would stack the action controls on top of each other on a phone.
    */
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Staff accounts" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Added</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {users.map(x => (
            <UsersTableRow
              key={x.userId}
              user={x}
              viewer={viewer}
              onEdit={onEdit}
              onApproval={onApproval}
              onActivation={onActivation}
              onDelete={onDelete}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
