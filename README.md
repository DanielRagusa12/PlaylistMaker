# PlaylistMaker

## Description

This is a personal project I developed to learn more about JavaScript and web development. It integrates Spotify OAuth 2.0 for user authentication, stores user session data in a MongoDB database, and provides functionality for users to generate and add recomended songs to their playlists. The recomendations are tailored to the music that already exists within the playlist. Front-end built with Pug and HTMX.

The [project](https://htmx-web-app-3e9b7886afe4.herokuapp.com) is deployed using Heroku.

## Installation for local development

1. Clone the dev branch of the repository:
    ```bash
    git clone -b dev https://github.com/DanielRagusa12/PlaylistMaker
    ```

2. Navigate into the project directory:
    ```bash
    cd PlaylistMaker
    ```

3. Install the necessary dependencies:
    ```bash
    npm i
    ```
4. Setup environment variables

    The app requires a MongoDB database and a Spotify Web API application. 

    - For MongoDB:
        - Sign up for a free account at [MongoDB](https://www.mongodb.com/).
        - Create a new cluster and obtain the connection string.
        - Set this connection string as an environment variable named `MONGODB_URI`.

    - For Spotify Web API:
        - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications) and log in with your Spotify account.
        - Click on 'Create an App' and fill out the necessary information.
        - Once the app is created, you'll be provided with a Client ID and Client Secret.
        - Set these as environment variables named `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` respectively.

    You can set environment variables in your `.env` file in the root directory of your project. The file should look something like this:

     ```bash
    PORT=4000
    MONGO_URI=your_mongodb_connection_string
    CLIENT_ID=your_spotify_client_id
    CLIENT_SECRET=your_spotify_client_secret
    SESSION_SECRET=your_session_secret
    ```

    The SESSION_SECRET should be a long, random string.

4. Start the server
    ```bash
    npm run
    ```
    Start with Nodemon
    ```bash
    npm run dev
    ```
    The application will be running at [http://localhost:4000](http://localhost:4000) by default.






## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.