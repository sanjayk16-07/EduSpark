# EduSpark

EduSpark is an AI-powered learning assistant designed to help students understand topics, create study notes, practice quizzes, and clear their doubts in one place.

## Features

- **Smart Notes:** Generate organized study notes from a topic or learning material.
- **Interactive Quizzes:** Create quizzes to test your knowledge, check your answers, and learn from explanations.
- **AI Doubt Solver:** Ask questions and get AI-generated explanations.
- **Notes Storage:** Save and access your notes using browser local storage.
- **Quiz History:** Track quiz attempts and review your performance.
- **Dark Mode:** Switch between light and dark themes for comfortable learning.

## Tech Stack

- HTML, CSS, and JavaScript
- Node.js
- Express.js
- Google Gemini API
- Local Storage

## Getting Started

Follow these steps to run EduSpark on your computer.

### 1. Install Node.js

Download and install Node.js from:

https://nodejs.org/

### 2. Clone the Repository

Open your terminal and run:

```bash
git clone https://github.com/sanjayk16-07/EduSpark.git
```

### 3. Open the Project Folder

```bash
cd EduSprak
```

If the cloned folder is named `EduSpark`, use `cd EduSpark` instead.

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure the Gemini API Key

Create or open the `.env` file in the project root and add:

```env
GEMINI_API_KEY=your_gemini_api_key
PORT=3000
```

Replace `your_gemini_api_key` with your own API key from Google AI Studio:

https://aistudio.google.com/

**Important:** Keep your API key private. Never upload your `.env` file to GitHub or expose your key in frontend JavaScript.

### 6. Start the Application

```bash
npm start
```

Open your browser and visit:

http://localhost:3000

## Project Structure

```text
EduSpark/
├── index.html       # Frontend interface
├── server.js        # Express server and API endpoints
├── package.json     # Project configuration and dependencies
├── .env             # Private environment variables
├── .gitignore       # Files excluded from Git
└── README.md        # Project documentation
```

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/health` | Check server status |
| POST | `/api/notes` | Generate smart study notes |
| POST | `/api/quiz` | Generate interactive quizzes |
| POST | `/api/doubt` | Get answers to questions |

## How It Works

1. Open EduSpark in your browser.
2. Choose a learning feature, such as Smart Notes, Interactive Quiz, or Doubt Solver.
3. Enter a topic, learning material, or question.
4. EduSpark sends the request to its backend server.
5. The backend uses the Google Gemini API to generate a response.
6. View your results and use them to support your learning.

## Security

- API keys are stored in environment variables.
- The `.env` file should be excluded from version control.
- Never share your Gemini API key publicly.

## Future Improvements

- User accounts and personalized learning
- Progress tracking and analytics
- More quiz formats and difficulty levels
- Cloud-based storage for notes and learning history
- Improved mobile accessibility

## Contributing

Contributions, suggestions, and bug reports are welcome. Feel free to fork this repository and submit a pull request.

## License

No license has been specified yet. Please add a license before allowing others to reuse or distribute this project.

---

**EduSpark — Learn smarter, practice better, and grow every day.**
