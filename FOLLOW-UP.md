## Architecture & Design Decisions

**Q) Describe your overall architecture and design decisions. Why did you choose this structure?**  
(Explain your folder structure, separation of concerns, design patterns used, and architectural choices.)

**Q) What libraries and frameworks did you choose and why?**  
(Explain your technology choices for both frontend and backend, including state management, validation, database ORM/ODM, etc.)

**Q) How did you structure your database schema? What relationships and indexes did you create?**  
(Describe your database design, including any performance optimizations.)

---

## Implementation Details

**Q) Explain your conflict detection algorithm. How does it work and what edge cases did you consider?**  
(Describe the logic, time complexity, and how you handle various conflict scenarios.)

**Q) Explain your AI-powered trainer matching implementation. How did you integrate with the external AI API?**  
(Describe your AI service choice, prompt engineering approach, how you structure context for the AI, parse responses, handle API errors and rate limits, and what fallback mechanisms you implemented.)

**Q) How does the application handle trainer assignment and email notifications?**  
(Describe the flow, error handling, transaction management, and how Mailhog was used for testing.)

**Q) What security measures did you implement?**  
(Explain input validation, sanitization, SQL injection prevention, XSS protection, authentication security, etc.)

**Q) How did you handle error cases and edge scenarios?**  
(Describe your error handling strategy, user feedback, logging, and graceful degradation.)

---

## Technical Questions

**Q) What command do you use to start the application locally?**  
`(Provide the command, e.g., docker-compose up, npm start)`

**Q) How would you scale this application to handle 10,000+ courses?**  
(Describe performance optimizations, caching strategies, database optimizations, etc.)

**Q) How would you handle concurrent trainer assignments to the same course?**  
(Explain your approach to race conditions, database transactions, locking mechanisms, etc.)

**Q) What testing strategy would you implement for this application?**  
(Describe unit tests, integration tests, E2E tests, and what you would test.)

---

## Reflection

**Q) If you had more time, what improvements or new features would you add?**  
(Discuss potential enhancements, optimizations, or features that would make this production-ready.)

**Q) Which parts of the project are you most proud of? Why?**  
(Highlight the parts of the code that demonstrate your best work, problem-solving skills, or technical expertise.)

**Q) Which parts did you spend the most time on? What did you find most challenging?**  
(Describe the most complex problems you solved, trade-offs you made, and what you learned.)

**Q) What trade-offs did you make during development?**  
(Explain any shortcuts, simplifications, or decisions you made due to time constraints, and how you would improve them.)

**Q) Did you use AI coding tools (Claude Code, Copilot, Cursor, ChatGPT, etc.) during this assessment? If so, describe exactly how.**  
(Be honest — we expect experienced engineers to use AI tools. What matters is *how* you used them. Did you prompt-and-accept, or did you direct, review, and correct? What decisions did you make that the AI could not have made for you?)

**Q) What part of this assessment could NOT be completed by an AI tool acting alone, and why?**  
(This is the most important reflection question. Identify the decision, design choice, or judgment call in your submission that required genuine engineering expertise — not just generation.)

**Q) How did you approach the AI API integration? What AI service did you choose and why?**  
(Describe your AI service selection, prompt design process, how you structured the context and prompts, response parsing strategy, error handling approach, cost considerations, and any alternatives you considered.)

---

## Agentic Engineering

**Q) Walk us through the agent pipeline you designed in your skill file. What are the agents, what does each one receive as input, and what does it produce as output?**  
(Be specific — list each agent by name and describe its exact input/output contract. Vague answers like "it passes context to the next agent" will score poorly.)

**Q) How did you decide where to draw the boundary between agents? Why didn't you use fewer agents (e.g., one mega-agent) or more agents?**  
(Explain your reasoning about agent granularity. What would break if you merged two agents? What would be wasteful if you split one further?)

**Q) What context does each agent receive, and what did you deliberately exclude? Why?**  
(Good agentic design means agents get exactly what they need — no more, no less. Explain the tradeoffs you made in context scoping.)

**Q) How does your pipeline handle a rejection from the Reviewer Agent? Walk through the exact flow step by step.**  
(Describe how the critique is passed back, which agent handles it, and how you prevent infinite loops.)

**Q) What is the termination condition for your pipeline? Under what circumstances does it stop, and how do you know it completed successfully vs. failed silently?**  
(Explain both the success path and the failure path.)

**Q) What would break first if you ran this skill against a significantly larger codebase (e.g., 50 files, 10,000 lines)? How would you fix it?**  
(This tests whether you understand the context window and cost constraints of agentic systems at scale.)

**Q) If the Reviewer Agent consistently rejects valid output due to a poorly written review prompt, how would you debug and fix it without changing the other agents?**  
(This tests your ability to isolate failures in a multi-agent system.)

---

## Feedback

**Q) How did you find the assessment overall? Did you encounter any issues or difficulties?**  
(Provide honest feedback on the assessment's difficulty, clarity, and any areas that could be improved.)

**Q) Do you have any suggestions on how we can improve the assessment?**  
(We welcome suggestions to improve the interview process, assessment structure, or requirements clarity.)
