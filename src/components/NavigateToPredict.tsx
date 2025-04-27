import { useRouter } from 'next/router';

const NavigateToPredict = () => {
  const router = useRouter();

  const handleNavigate = () => {
    router.push('/predict'); // Navigate to the predict page
  };

  return (
    <div className="flex justify-center items-center mt-10">
      <button
        onClick={handleNavigate}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Predict Colleges
      </button>
    </div>
  );
};

export default NavigateToPredict;