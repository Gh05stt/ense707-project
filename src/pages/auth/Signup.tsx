import { Link } from "react-router-dom";

import { useSignupController } from "../../lib/controllers/signup";

function Signup() {
  const { name, email, password, error, successMessage, isSubmitting, setName, setEmail, setPassword, handleSubmit } =
    useSignupController();

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-xl border border-gray-300 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Sign up</h1>

        <div className="flex flex-col gap-1">
          <label htmlFor="name" className="text-sm text-gray-700">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="text-sm text-gray-700">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="text-sm text-gray-700">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-gray-900 px-4 py-2 text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
        >
          {isSubmitting ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-center text-sm text-gray-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-gray-900 underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}

export default Signup;
