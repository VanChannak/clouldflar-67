import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

interface SubscriptionPlansTableProps {
  onEdit: (plan: any) => void;
}

export function SubscriptionPlansTable({ onEdit }: SubscriptionPlansTableProps) {
  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="p-3 text-left text-sm font-medium">Name</th>
            <th className="p-3 text-left text-sm font-medium">Price</th>
            <th className="p-3 text-left text-sm font-medium">Duration</th>
            <th className="p-3 text-right text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td colSpan={4} className="p-8 text-center text-muted-foreground">
              No subscription plans yet
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
