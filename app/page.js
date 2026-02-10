export default function Home() {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-1 flex items-center justify-center">
        <div className="container">
          map goes here
        </div>
      </main>
      <nav className="flex justify-around items-center border-t border-gray-200 dark:border-gray-800 py-4">
        <button className="px-4 py-2">Button 1</button>
        <button className="px-4 py-2">Button 2</button>
        <button className="px-4 py-2">Button 3</button>
        <button className="px-4 py-2">Button 4</button>
      </nav>
    </div>
  );
}
