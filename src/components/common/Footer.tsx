import { Link } from 'react-router-dom';

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
        <div className="flex items-center gap-4 text-xs">
          <Link to="/about" className="text-gray-500 hover:text-gray-300 transition-colors">
            About
          </Link>
          <Link to="/tutorials" className="text-gray-500 hover:text-gray-300 transition-colors">
            How to Type
          </Link>
          <span className="text-gray-700">TypeStar — Learn to type, one key at a time.</span>
        </div>
      </div>
    </footer>
  );
}
