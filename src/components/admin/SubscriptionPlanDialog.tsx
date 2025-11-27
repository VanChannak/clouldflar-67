import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

interface SubscriptionPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any;
}

export function SubscriptionPlanDialog({ open, onOpenChange, plan }: SubscriptionPlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{plan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Plan Name</Label>
            <Input placeholder="Enter plan name" />
          </div>
          <div>
            <Label>Price</Label>
            <Input type="number" placeholder="0.00" />
          </div>
          <div>
            <Label>Duration (days)</Label>
            <Input type="number" placeholder="30" />
          </div>
          <Button className="w-full">Save Plan</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
