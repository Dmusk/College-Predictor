type ButtonProps = {
  onClick: () => void;
  children: React.ReactNode;
};

export default function Button({ onClick, children }: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-md transition duration-300"
    >
      {children}
    </button>
  );
}