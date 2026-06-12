export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-6 px-4 mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm font-body">
        <span>
          Built with{' '}
          <span className="text-pink-400">♥</span>
          {' '}by{' '}
          <a
            href="https://theclouddevopslearningblog.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-purple-400 hover:text-purple-300 font-bold transition-colors"
          >
            The Cloud DevOps Learning Blog
          </a>
        </span>
        <span className="text-gray-600 text-xs">
          TypeStar — Learn to type, one key at a time.
        </span>
      </div>
    </footer>
  );
}
