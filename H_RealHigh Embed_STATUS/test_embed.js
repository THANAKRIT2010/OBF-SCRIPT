const { Embed_Start } = require('./Embed_Start.js');
try {
    const embed = Embed_Start();
    console.log(embed);
} catch (e) {
    console.error("Test failed:", e);
}
