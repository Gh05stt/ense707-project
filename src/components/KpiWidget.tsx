//KPI Widget for use on the overview dashboard

interface KpiWidgetProps {
  title: string;
  value: number;
}

function KpiWidget({ title, value }: KpiWidgetProps) {
  return (
    <div className="flex h-40 w-full flex-col items-center justify-center rounded-xl border border-gray-300 bg-white p-4 text-center shadow-sm">
      <span className="text-sm font-medium text-gray-600">{title}</span>
      <span className="mt-2 text-3xl font-semibold text-gray-900">{value}</span>
    </div>
  );
}

export default KpiWidget;
