import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import { USER_NAV_ITEMS } from "../../config/navigation";
import { CATEGORY_OPTIONS, PRIORITY_OPTIONS, useCreateTicketController } from "../../lib/controllers/createTicket";

const FIELD_LABEL_CLASS = "w-28 shrink-0 text-base text-gray-800";
const FIELD_INPUT_CLASS =
  "flex-1 rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none";

function CreateTicket() {
  const { form, errors, submitError, isSubmitting, handleTextChange, handleSelectChange, handleSubmit } =
    useCreateTicketController();

  return (
    <div className="flex h-screen w-screen bg-gray-50">
      <Sidebar navItems={USER_NAV_ITEMS} roleLabel="User" />

      <div className="flex flex-1 flex-col">
        <Header title="Create Ticket" />

        <main className="flex flex-1 flex-col overflow-hidden p-8">
          <form onSubmit={handleSubmit} noValidate className="flex h-full w-full flex-col gap-4">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <label htmlFor="title" className={FIELD_LABEL_CLASS}>
                  Title:
                </label>
                <input
                  id="title"
                  type="text"
                  value={form.title}
                  onChange={handleTextChange("title")}
                  className={FIELD_INPUT_CLASS}
                />
              </div>
              {errors.title && <p className="ml-32 text-sm text-red-600">{errors.title}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <label htmlFor="category" className={FIELD_LABEL_CLASS}>
                  Category:
                </label>
                <select
                  id="category"
                  value={form.category}
                  onChange={handleSelectChange("category")}
                  className={FIELD_INPUT_CLASS}
                >
                  <option value="">Select a category</option>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              {errors.category && <p className="ml-32 text-sm text-red-600">{errors.category}</p>}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-4">
                <label htmlFor="priority" className={FIELD_LABEL_CLASS}>
                  Priority:
                </label>
                <select
                  id="priority"
                  value={form.priority}
                  onChange={handleSelectChange("priority")}
                  className={FIELD_INPUT_CLASS}
                >
                  <option value="">Select a priority</option>
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              {errors.priority && <p className="ml-32 text-sm text-red-600">{errors.priority}</p>}
            </div>

            <div className="mt-2 flex flex-1 flex-col gap-1">
              <label htmlFor="description" className="text-base text-gray-800">
                Description:
              </label>
              <textarea
                id="description"
                value={form.description}
                onChange={handleTextChange("description")}
                className="w-full flex-1 resize-none rounded-md border border-gray-400 px-3 py-2 focus:border-gray-600 focus:outline-none"
              />
              {errors.description && <p className="text-sm text-red-600">{errors.description}</p>}
            </div>

            {submitError && <p className="text-sm text-red-600">{submitError}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-md bg-gray-900 px-6 py-2 text-white transition-colors hover:bg-gray-700 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
}

export default CreateTicket;
