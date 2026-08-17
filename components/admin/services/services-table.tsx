import { ServiceItemDto } from '@/types';

import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui';

import { ServicesTableRow } from './services-table-row';

type ServicesTableProps = {
  services: ServiceItemDto[];
  onEdit: (service: ServiceItemDto) => void;
  onActivation: (service: ServiceItemDto) => void;
  onDelete: (service: ServiceItemDto) => void;
};

export function ServicesTable({ services, onEdit, onActivation, onDelete }: ServicesTableProps) {
  return (
    /*
      The wrapper scrolls and the table refuses to go below its natural width. Without that
      floor the browser honours the 100% width instead and crushes every column — which is
      what would stack the action controls on top of each other on a phone.
    */
    <div className="border-border w-full overflow-x-auto rounded-lg border">
      <Table aria-label="Service catalogue" className="min-w-3xl">
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Category</TableHead>
            <TableHead className="text-end">Price</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-end">Actions</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {services.map(x => (
            <ServicesTableRow key={x.serviceItemId} service={x} onEdit={onEdit} onActivation={onActivation} onDelete={onDelete} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
