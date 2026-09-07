export default function DashboardLoading() {
  return (
    <main className="dashboard-shell" aria-busy="true">
      <div className="loading-line" />
      <div className="loading-title" />
      <div className="loading-grid"><i /><i /><i /></div>
    </main>
  );
}
