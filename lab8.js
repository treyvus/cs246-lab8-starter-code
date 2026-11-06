/**
Name:Thomas Trey Kramer
Date:11-5-2026
Description:
Bugs: 
Reflection: 
*/

import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({
    path: new URL('.env', import.meta.url),
    quiet: true
});

if (!process.env.DATABASE_URL) {
    throw new Error('Set DATABASE_URL in .env before running.');
}

const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10000
});

async function bornAfter(year) {
    const { rows } = await client.query(
        `SELECT first_name, last_name
         FROM directors
         WHERE birth_year > $1
         ORDER BY last_name`,
        [year]
    );

    console.log("Directors born after " + year + ":");

    for (const row of rows) {
        console.log(row.first_name + " " + row.last_name);
    }
}

async function gross(min_gross, max_gross, symbol) {
    const { rows } = await client.query(
        `SELECT name, rotten_tomatoes_score
         FROM movies
         WHERE gross_earnings BETWEEN $1 AND $2`,
        [min_gross, max_gross]
    );

    console.log("\nMovies within earnings range:");

    for (const row of rows) {
        const score = Number(row.rotten_tomatoes_score);
        const count = score % 10;
        const symbols = symbol.repeat(count);

        console.log(`${row.name}(${symbols})`);
    }
}

async function profitMatters() {
    const { rows } = await client.query(
        `SELECT gross_earnings, rotten_tomatoes_score
         FROM movies
         WHERE gross_earnings IS NOT NULL
         AND rotten_tomatoes_score IS NOT NULL`
    );

    const n = rows.length;

    if (n < 2) {
        console.log("\nPearson's r: Not enough data");
        return;
    }

    const x = rows.map(row => Number(row.gross_earnings));
    const y = rows.map(row => Number(row.rotten_tomatoes_score));

    const meanX = x.reduce((sum, value) => sum + value, 0) / n;
    const meanY = y.reduce((sum, value) => sum + value, 0) / n;

    let numerator = 0;
    let sumX2 = 0;
    let sumY2 = 0;

    for (let i = 0; i < n; i++) {
        const dx = x[i] - meanX;
        const dy = y[i] - meanY;

        numerator += dx * dy;
        sumX2 += dx * dx;
        sumY2 += dy * dy;
    }

    const denominator = Math.sqrt(sumX2) * Math.sqrt(sumY2);

    if (denominator === 0) {
        console.log("\nPearson's r: Undefined");
        return;
    }

    const r = numerator / denominator;

    console.log("\nPearson's r:", r);
}

async function changeMoviePerformance(
    movieId,
    rottenTomatoesScore,
    grossEarnings
) {
    const { rows } = await client.query(
        `UPDATE movies
         SET rotten_tomatoes_score = $1,
             gross_earnings = $2
         WHERE movie_id = $3
         RETURNING movie_id, name, rotten_tomatoes_score, gross_earnings`,
        [rottenTomatoesScore, grossEarnings, movieId]
    );

    if (rows.length === 0) {
        console.log("\nMovie not found:", movieId);
        return;
    }

    console.log("\nUpdated movie:", rows[0]);
}

async function main() {
    try {
        await client.connect();

        await bornAfter(1960);

        await gross(470700000, 980000000, '🍅');

        await profitMatters();

        await changeMoviePerformance(1, 97, 470700000);
    }
    catch (error) {
        console.error("Database error:", error.message);
        process.exitCode = 1;
    }
    finally {
        await client.end();
    }
}

await main();