// root component - pretty simple, just wraps everything in a container
// and renders the BooksList which does all the heavy lifting
import BooksList from './components/BooksList';

function App() {
  return (
    <div className="container my-4">
      <h1 className="mb-4">Online Bookstore</h1>
      {/* note for the TA: the two bootstrap things I used that weren't in the videos */}
      <p className="text-muted small">
        Bootstrap extras used: Accordion filters and Offcanvas cart panel.
      </p>
      <BooksList />
    </div>
  );
}

export default App;
