interface OrderStatusBadgeProps {
  status: string;
}

export default function OrderStatusBadge({ status }: OrderStatusBadgeProps) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: '결제대기', color: 'bg-yellow-100 text-yellow-800' },
    paid: { label: '결제완료', color: 'bg-blue-100 text-blue-800' },
    preparing: { label: '배송준비', color: 'bg-purple-100 text-purple-800' },
    shipping: { label: '배송중', color: 'bg-green-100 text-green-800' },
    delivered: { label: '배송완료', color: 'bg-gray-100 text-gray-800' },
    cancelled: { label: '취소', color: 'bg-red-100 text-red-800' },
    refunded: { label: '환불', color: 'bg-pink-100 text-pink-800' },
    returning: { label: '반품중', color: 'bg-orange-100 text-orange-800' },
    returned: { label: '반품완료', color: 'bg-orange-100 text-orange-800' },
  };

  const config = statusConfig[status] || { 
    label: status, 
    color: 'bg-gray-100 text-gray-800' 
  };

  return (
    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${config.color}`}>
      {config.label}
    </span>
  );
}
