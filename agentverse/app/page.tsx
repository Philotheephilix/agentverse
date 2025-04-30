import GameWrapper from './components/GameWrapper';

export default function Home() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-gray-800 p-4">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <GameWrapper />
      </div>
    </main>
  );
}
