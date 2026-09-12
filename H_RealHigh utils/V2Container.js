'use strict';
const {
    ContainerBuilder, TextDisplayBuilder, SeparatorBuilder,
    MediaGalleryBuilder, MediaGalleryItemBuilder, MessageFlags
} = require('discord.js');

// ── สร้าง Container แบบ V2 (ไม่ตั้งสี ตามข้อกำหนดของระบบ) ──
function buildContainer(title, lines = [], opts = {}) {
    const container = new ContainerBuilder();

    container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`## ${title}`));

    if (lines.length) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
    }

    if (opts.imageUrl) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addMediaGalleryComponents(
            new MediaGalleryBuilder().addItems(new MediaGalleryItemBuilder().setURL(opts.imageUrl))
        );
    }

    if (opts.footer) {
        container.addSeparatorComponents(new SeparatorBuilder());
        container.addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${opts.footer}`));
    }

    if (opts.rows) {
        container.addSeparatorComponents(new SeparatorBuilder());
        for (const row of opts.rows) container.addActionRowComponents(row);
    }

    return container;
}

// ── ประกอบ payload สำหรับ reply / editReply / update ──
function v2Payload(container, ephemeral = true) {
    return {
        components: [container],
        flags: ephemeral ? (MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral) : MessageFlags.IsComponentsV2
    };
}

module.exports = { buildContainer, v2Payload };
