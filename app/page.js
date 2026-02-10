export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center">
        <div className="container">
          map goes here
        </div>
      </main>
      <nav className="flex justify-around items-center border-t border-gray-200 dark:border-gray-800 py-4">
        <button className="px-4 py-2">Create NEw Basket</button>
        <button className="px-4 py-2">View Basket</button>
        <button className="px-4 py-2">Map</button>
        <button className="px-4 py-2">Account Settings</button>
      </nav>
    </div>
  );
}
