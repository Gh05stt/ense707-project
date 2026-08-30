interface HeaderProps {
  title: string;
}

function Header({ title }: HeaderProps) {
  return (
    <header className="flex h-16 w-full items-center justify-center border-b border-gray-300 bg-white">
      <h1 className="text-lg font-medium text-gray-900">{title}</h1>
    </header>
  );
}

export default Header;
