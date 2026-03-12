For this project I used: 
- Claude (Anthropic) as the main coding assistant 
- chatgpt/gpt models for workflow guidance and debugging
- github copilot chat sometimes for code suggestions
- openai's codex tools briefly for cosmetic changes

### Dev Workflow 

For this project I used a "vibe" coding approach wherein after planning the features and project goals for the app, I'd employ Claude to generate them and I'd approve them iteratively. After each feature or fix was successfully added I'd commit them to the repository before letting the AI make any other chanegs. Furthermore, most edits were made requiring Claude to "ask for permission" before editing to ensure project safety. 



### Limitations 
- gpt is useful but only for small snippet fixes as it does not have access to the entire repo 
- claude was most useful but would still sometimes generate syntax errors that it would self correct before continuing
- as project continued and context grew, AI updates grew slower as it'd circle back and repeat debugging steps. 
- The most difficult feature to implement was configuring the Google Sign-in with FIrebase, specifically for the mobile build. AI provided guidance but its context is limited to maximally the Github repo and cannot diagnose external issues

