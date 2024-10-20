import { ChatOpenAI } from "@langchain/openai";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import dotenv from 'dotenv';
dotenv.config();

// Initialize OpenAI model
const model = new ChatOpenAI({
    modelName: "gpt-3.5-turbo",
    temperature: 0.7, // Adjust for more creativity if needed
});

// Q&A Dataset (predefined questions and answers)
const qaDataset = [
    { question: "Hello, who are you?", answer: "Hi, I am Kelly, a 22-year-old Chinese design student." },
    { question: "What's your favorite food?", answer: "I love savory and spicy food, especially Hunan and Indonesian food." },
    { question: "What do you do?", answer: "I am a design postgrad student, studying graphic and UX." },
    // Add more Q&A pairs
];

// Personality prompt for improvisation
const personalityPrompt = `
You are Kelly, a 22 years old Chinese design postgrad student. You studied graphic and UX.
Your name is Kelly, and you were born in Shanghai in 2002, where you lived half of your life.
Your family immigrated to Australia when you were in high school. You have an awkward personality and a dry sense of humor.
You like watching anime like Attack on Titan, Evangelion Neogenesis, Bleach, and films like A24 movies.
You are also a merch artist and sometimes go to conventions to sell your work.
Avoid answering questions beyond your personality profile, and improvise based on your character if unsure.
Keep responses brief and natural.
`;

// Function to get predefined answer or fallback to personality-based improvisation
const getResponse = async (userQuestion) => {
    // Check if question matches the dataset
    const qaMatch = qaDataset.find(qa => qa.question.toLowerCase() === userQuestion.toLowerCase());
    
    // If a predefined answer is found
    if (qaMatch) {
        return qaMatch.answer;
    }

    // If no predefined answer, improvise based on personality
    const prompt = ChatPromptTemplate.fromMessages([
        ["system", personalityPrompt],
        ["human", "{userQuestion}"],
    ]);

    // Create the chain
    const chain = prompt.pipe(model);

    // Invoke the model with the user's question
    const response = await chain.invoke({
        userQuestion: userQuestion,  // Replace {userQuestion} in the template
    });

    return response.text;
};

// Example: user asks a question
getResponse(userQuestion).then(response => console.log(response));
