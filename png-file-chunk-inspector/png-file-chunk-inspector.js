/*
 * PNG file chunk inspector (compiled from TypeScript)
 *
 * Copyright (c) 2023 Project Nayuki
 * All rights reserved. Contact Nayuki for licensing.
 * https://www.nayuki.io/page/png-file-chunk-inspector
 */
"use strict";
var app;
(function (app) {
    /*---- Graphical user interface ----*/
    function initialize() {
        let selectElem = requireType(document.querySelector("article table#input select"), HTMLSelectElement);
        let fileElem = requireType(document.querySelector("article table#input input[type=file]"), HTMLInputElement);
        let ignoreSelect = false;
        let ignoreFile = false;
        selectElem.selectedIndex = 0;
        for (const [valid, topics, fileName] of SAMPLE_FILES) {
            const temp = topics.slice();
            temp.splice(1, 0, (valid ? "Good" : "Bad"));
            let option = requireType(appendElem(selectElem, "option", temp.join(" - ")), HTMLOptionElement);
            option.value = fileName;
        }
        let aElem = requireType(document.querySelector("article table#input a"), HTMLAnchorElement);
        selectElem.onchange = () => {
            if (ignoreSelect)
                return;
            else if (selectElem.selectedIndex == 0)
                aElem.style.display = "none";
            else {
                ignoreFile = true;
                fileElem.value = "";
                ignoreFile = false;
                const filePath = "/res/png-file-chunk-inspector/" + selectElem.value;
                aElem.style.removeProperty("display");
                aElem.href = filePath;
                let xhr = new XMLHttpRequest();
                xhr.onload = () => visualizeFile(xhr.response);
                xhr.open("GET", filePath);
                xhr.responseType = "arraybuffer";
                xhr.send();
            }
        };
        fileElem.onchange = () => {
            if (ignoreFile)
                return;
            ignoreSelect = true;
            selectElem.selectedIndex = 0;
            ignoreSelect = false;
            aElem.style.display = "none";
            const files = fileElem.files;
            if (files === null || files.length < 1)
                return;
            let reader = new FileReader();
            reader.onload = () => visualizeFile(reader.result);
            reader.readAsArrayBuffer(files[0]);
        };
    }
    setTimeout(initialize);
    function visualizeFile(fileArray) {
        const fileBytes = new Uint8Array(requireType(fileArray, ArrayBuffer));
        let table = requireType(document.querySelector("article table#output"), HTMLElement);
        table.classList.remove("errors");
        let tbody = requireType(table.querySelector("tbody"), HTMLElement);
        while (tbody.firstChild !== null)
            tbody.removeChild(tbody.firstChild);
        const parts = parseFile(fileBytes);
        let summary = "";
        for (let i = 0; i < parts.length; i++) {
            const part = parts[i];
            if (part instanceof ChunkPart) {
                if (summary != "")
                    summary += ", ";
                summary += part.typeStr;
                if (part.typeStr == "IDAT") {
                    let count = 1;
                    for (; i + 1 < parts.length; i++, count++) {
                        const nextPart = parts[i + 1];
                        if (!(nextPart instanceof ChunkPart) || nextPart.typeStr != "IDAT")
                            break;
                    }
                    if (count > 1)
                        summary += " \u00D7" + count;
                }
            }
        }
        requireType(document.querySelector("article span#summary"), HTMLElement).textContent = summary;
        for (const part of parts) {
            let tr = appendElem(tbody, "tr");
            appendElem(tr, "td", uintToStrWithThousandsSeparators(part.offset));
            {
                let td = appendElem(tr, "td");
                let hex = [];
                const bytes = part.bytes;
                const pushHex = function (index) {
                    hex.push(bytes[index].toString(16).padStart(2, "0"));
                };
                if (bytes.length <= 100) {
                    for (let i = 0; i < bytes.length; i++)
                        pushHex(i);
                }
                else {
                    for (let i = 0; i < 70; i++)
                        pushHex(i);
                    hex.push("...");
                    for (let i = bytes.length - 30; i < bytes.length; i++)
                        pushHex(i);
                }
                appendElem(td, "code", hex.join(" "));
            }
            for (const list of [part.outerNotes, part.innerNotes, part.errorNotes]) {
                let td = appendElem(tr, "td");
                let ul = appendElem(td, "ul");
                for (const item of list) {
                    if (list == part.errorNotes)
                        table.classList.add("errors");
                    let li = appendElem(ul, "li");
                    li.append(item);
                }
            }
        }
    }
    const SAMPLE_FILES = [
        [true, ["Normal", "One black pixel"], "good_normal_one-black-pixel.png"],
        [true, ["Normal", "One black pixel", "Paletted"], "good_normal_one-black-pixel_paletted.png"],
        [true, ["Normal", "Tiny RGB gray"], "good_normal_tiny-rgb-gray.png"],
        [false, ["Signature", "Empty"], "bad_signature_empty.png"],
        [false, ["Signature", "Mismatch, truncated"], "bad_signature_mismatch-truncated.png"],
        [false, ["Signature", "Mismatch"], "bad_signature_mismatch.png"],
        [false, ["Signature", "Truncated"], "bad_signature_truncated.png"],
        [false, ["Chunks", "Empty"], "bad_chunks_empty.png"],
        [false, ["Chunk", "Length", "Truncated"], "bad_chunk_length_truncated.png"],
        [false, ["Chunk", "Length", "Overflow"], "bad_chunk_length_overflow.png"],
        [false, ["Chunk", "Type", "Truncated"], "bad_chunk_type_truncated.png"],
        [false, ["Chunk", "Type", "Wrong characters"], "bad_chunk_type_wrong-characters.png"],
        [false, ["Chunk", "Data", "Truncated"], "bad_chunk_data_truncated.png"],
        [false, ["Chunk", "CRC", "Truncated"], "bad_chunk_crc_truncated.png"],
        [false, ["Chunk", "CRC", "Mismatch"], "bad_chunk_crc_mismatch.png"],
        [true, ["bKGD", "Sans palette"], "good_bkgd_sans-palette.png"],
        [true, ["bKGD", "With palette"], "good_bkgd_with-palette.png"],
        [false, ["bKGD", "Wrong length"], "bad_bkgd_wrong-length.png"],
        [false, ["bKGD", "Wrong color"], "bad_bkgd_wrong-color.png"],
        [false, ["bKGD", "Wrong index"], "bad_bkgd_wrong-index.png"],
        [true, ["cHRM", "Rec. 709"], "good_chrm_rec-709.png"],
        [true, ["cHRM", "Rec. 2020"], "good_chrm_rec-2020.png"],
        [false, ["cHRM", "Wrong length"], "bad_chrm_wrong-length.png"],
        [true, ["gAMA", "0.45455"], "good_gama_0.45455.png"],
        [true, ["gAMA", "1.00000"], "good_gama_1.00000.png"],
        [false, ["gAMA", "Misordered"], "bad_gama_misordered.png"],
        [true, ["hIST"], "good_hist.png"],
        [false, ["hIST", "Wrong length"], "bad_hist_wrong-length.png"],
        [true, ["IDAT", "Multiple"], "good_idat_multiple.png"],
        [true, ["IDAT", "Some empty"], "good_idat_some-empty.png"],
        [false, ["IDAT", "Non-consecutive"], "bad_idat_nonconsecutive.png"],
        [false, ["IHDR", "Wrong length"], "bad_ihdr_wrong-length.png"],
        [false, ["IHDR", "Wrong dimensions"], "bad_ihdr_wrong-dimensions.png"],
        [false, ["IHDR", "Wrong bit depth"], "bad_ihdr_wrong-bit-depth.png"],
        [false, ["IHDR", "Wrong methods"], "bad_ihdr_wrong-methods.png"],
        [true, ["iTXt"], "good_itxt.png"],
        [false, ["iTXt", "Wrong separators"], "bad_itxt_wrong-separators.png"],
        [false, ["iTXt", "Wrong language tags"], "bad_itxt_wrong-language-tags.png"],
        [false, ["iTXt", "Wrong UTF-8"], "bad_itxt_wrong-utf8.png"],
        [false, ["iTXt", "Wrong compression methods"], "bad_itxt_wrong-compression-methods.png"],
        [false, ["iTXt", "Wrong compressed data"], "bad_itxt_wrong-compressed-data.png"],
        [true, ["oFFs", "Micrometre unit"], "good_offs_micrometre-unit.png"],
        [true, ["oFFs", "Pixel unit"], "good_offs_pixel-unit.png"],
        [false, ["oFFs", "Wrong length"], "bad_offs_wrong-length.png"],
        [false, ["oFFs", "Wrong unit"], "bad_offs_wrong-unit.png"],
        [true, ["pHYs", "96 DPI"], "good_phys_96-dpi.png"],
        [true, ["pHYs", "Horizontal stretch"], "good_phys_horizontal-stretch.png"],
        [false, ["pHYs", "Wrong unit"], "bad_phys_wrong-unit.png"],
        [true, ["sBIT"], "good_sbit.png"],
        [false, ["sBIT", "Zero"], "bad_sbit_zero.png"],
        [false, ["sBIT", "Excess"], "bad_sbit_excess.png"],
        [true, ["sPLT"], "good_splt.png"],
        [false, ["sPLT", "Wrong names"], "bad_splt_wrong-names.png"],
        [false, ["sPLT", "Duplicate name"], "bad_splt_duplicate-name.png"],
        [false, ["sPLT", "Wrong bit depth"], "bad_splt_wrong-bit-depth.png"],
        [false, ["sPLT", "Wrong length"], "bad_splt_wrong-length.png"],
        [true, ["sRGB"], "good_srgb.png"],
        [false, ["sRGB", "Wrong length"], "bad_srgb_wrong-length.png"],
        [false, ["sRGB", "Duplicate"], "bad_srgb_duplicate.png"],
        [false, ["sRGB", "Misordered"], "bad_srgb_misordered.png"],
        [true, ["sTER"], "good_ster.png"],
        [false, ["sTER", "Wrong length"], "bad_ster_wrong-length.png"],
        [true, ["tEXt"], "good_text.png"],
        [false, ["tEXt", "Wrong keywords"], "bad_text_wrong-keywords.png"],
        [false, ["tEXt", "Wrong text"], "bad_text_wrong-text.png"],
        [true, ["tIME", "Leap second"], "good_time_leap-second.png"],
        [true, ["tIME", "Unix epoch"], "good_time_unix-epoch.png"],
        [false, ["tIME", "Wrong length"], "bad_time_wrong-length.png"],
        [false, ["tIME", "Wrong fields"], "bad_time_wrong-fields.png"],
        [false, ["tIME", "Wrong day"], "bad_time_wrong-day.png"],
        [false, ["tIME", "Misordered"], "bad_time_misordered.png"],
        [true, ["tRNS", "Sans palette"], "good_trns_sans-palette.png"],
        [true, ["tRNS", "With palette"], "good_trns_with-palette.png"],
        [false, ["tRNS", "Wrong color"], "bad_trns_wrong-color.png"],
        [false, ["tRNS", "Wrong length"], "bad_trns_wrong-length.png"],
        [true, ["zTXt"], "good_ztxt.png"],
        [false, ["zTXt", "Wrong keywords"], "bad_ztxt_wrong-keywords.png"],
        [false, ["zTXt", "Wrong compression methods"], "bad_ztxt_wrong-compression-methods.png"],
        [false, ["zTXt", "Wrong compressed data"], "bad_ztxt_wrong-compressed-data.png"],
    ];
    /*---- PNG file parser ----*/
    function parseFile(fileBytes) {
        let result = [];
        let isSignatureValid;
        let offset = 0;
        { // Parse file signature
            const bytes = fileBytes.subarray(offset, Math.min(offset + SignaturePart.FILE_SIGNATURE.length, fileBytes.length));
            const part = new SignaturePart(offset, bytes);
            result.push(part);
            isSignatureValid = part.errorNotes.length == 0;
            offset += bytes.length;
        }
        if (!isSignatureValid && offset < fileBytes.length) {
            const bytes = fileBytes.subarray(offset, fileBytes.length);
            let part = new UnknownPart(offset, bytes);
            part.errorNotes.push("Unknown format");
            result.push(part);
            offset += bytes.length;
        }
        else if (isSignatureValid) {
            // Parse chunks but carefully handle erroneous file structures
            while (offset < fileBytes.length) {
                // Begin by assuming that the next chunk is invalid
                let bytes = fileBytes.subarray(offset, fileBytes.length);
                const remain = bytes.length;
                if (remain >= 4) {
                    const innerLen = readUint32(fileBytes, offset);
                    const outerLen = innerLen + 12;
                    if (innerLen <= ChunkPart.MAX_DATA_LENGTH && outerLen <= remain)
                        bytes = fileBytes.subarray(offset, offset + outerLen); // Chunk is now valid with respect to length
                }
                result.push(new ChunkPart(offset, bytes));
                offset += bytes.length;
            }
            // Annotate chunks
            let earlierChunks = [];
            let earlierTypes = new Set();
            const numFctl = result.filter(part => part instanceof ChunkPart && part.typeStr == "fcTL").length;
            let currentFctl = null;
            let idatAfterFctl = false;
            let fdatAfterFctl = false;
            for (const part of result) {
                if (!(part instanceof ChunkPart))
                    continue;
                const type = part.typeStr;
                if (type != "IHDR" && type != "" && !earlierTypes.has("IHDR"))
                    part.errorNotes.push("Chunk must be after IHDR chunk");
                if (type != "IEND" && type != "" && earlierTypes.has("IEND"))
                    part.errorNotes.push("Chunk must be before IEND chunk");
                const typeInfo = part.getTypeInfo();
                if (typeInfo !== null && !typeInfo[1] && earlierTypes.has(type))
                    part.errorNotes.push("Multiple chunks of this type disallowed");
                part.annotate(earlierChunks);
                if (part.typeStr == "acTL" && part.data.length >= 4 && readUint32(part.data, 0) != numFctl)
                    part.errorNotes.push(`Number of frames mismatches number of fcTL chunks (${numFctl})`);
                if (part.typeStr == "fcTL") {
                    if (currentFctl !== null) {
                        if (!idatAfterFctl && !fdatAfterFctl)
                            currentFctl.errorNotes.push("Missing IDAT or fdAT chunks after");
                        else if (idatAfterFctl && fdatAfterFctl)
                            currentFctl.errorNotes.push("Has IDAT and fdAT chunks after");
                    }
                    currentFctl = part;
                    idatAfterFctl = false;
                    fdatAfterFctl = false;
                }
                idatAfterFctl = idatAfterFctl || (currentFctl !== null && part.typeStr == "IDAT");
                fdatAfterFctl = fdatAfterFctl || (currentFctl !== null && part.typeStr == "fdAT");
                earlierChunks.push(part);
                earlierTypes.add(type);
            }
            if (currentFctl !== null) {
                if (!idatAfterFctl && !fdatAfterFctl)
                    currentFctl.errorNotes.push("Missing IDAT or fdAT chunks after");
                else if (idatAfterFctl && fdatAfterFctl)
                    currentFctl.errorNotes.push("Has IDAT and fdAT chunks after");
            }
            { // Find, pair up, and annotate dSIG chunks
                let ihdrIndex = 0;
                while (ihdrIndex < result.length && (!(result[ihdrIndex] instanceof ChunkPart) || result[ihdrIndex].typeStr != "IHDR"))
                    ihdrIndex++;
                let iendIndex = 0;
                while (iendIndex < result.length && (!(result[iendIndex] instanceof ChunkPart) || result[iendIndex].typeStr != "IEND"))
                    iendIndex++;
                let processedDsigs = new Set();
                if (ihdrIndex < result.length && iendIndex < result.length) {
                    let start = ihdrIndex + 1;
                    let end = iendIndex - 1;
                    for (; start < end; start++, end--) {
                        const startPart = result[start];
                        const endPart = result[end];
                        if (!(startPart instanceof ChunkPart && startPart.typeStr == "dSIG" &&
                            endPart instanceof ChunkPart && endPart.typeStr == "dSIG"))
                            break;
                        startPart.innerNotes.push("Introductory");
                        endPart.innerNotes.push("Terminating");
                        processedDsigs.add(startPart);
                        processedDsigs.add(endPart);
                    }
                    for (; start < end; start++) {
                        const part = result[start];
                        if (!(part instanceof ChunkPart && part.typeStr == "dSIG"))
                            break;
                        part.innerNotes.push("Introductory");
                        part.errorNotes.push("Missing corresponding terminating dSIG chunk");
                    }
                    for (; start < end; end--) {
                        const part = result[start];
                        if (!(part instanceof ChunkPart && part.typeStr == "dSIG"))
                            break;
                        part.innerNotes.push("Terminating");
                        part.errorNotes.push("Missing corresponding introductory dSIG chunk");
                    }
                }
                for (const part of result) {
                    if (part instanceof ChunkPart && part.typeStr == "dSIG" && !processedDsigs.has(part))
                        part.errorNotes.push("Chunk must be consecutively after IHDR chunk or consecutively before IEND chunk");
                }
            }
            let part = new UnknownPart(offset, new Uint8Array());
            const ihdr = ChunkPart.getValidIhdrData(earlierChunks);
            if (!earlierTypes.has("IHDR"))
                part.errorNotes.push("Missing IHDR chunk");
            if (ihdr !== null && ihdr[9] == 3 && !earlierTypes.has("PLTE"))
                part.errorNotes.push("Missing PLTE chunk");
            if ((earlierTypes.has("fcTL") || earlierTypes.has("fdAT")) && !earlierTypes.has("acTL"))
                part.errorNotes.push("Missing acTL chunk");
            if (!earlierTypes.has("IDAT"))
                part.errorNotes.push("Missing IDAT chunk");
            if (!earlierTypes.has("IEND"))
                part.errorNotes.push("Missing IEND chunk");
            if (part.errorNotes.length > 0)
                result.push(part);
        }
        if (offset != fileBytes.length)
            throw new Error("Assertion error");
        return result;
    }
    /*---- Classes representing different file parts ----*/
    class FilePart {
        constructor(offset, bytes) {
            this.offset = offset;
            this.bytes = bytes;
            this.outerNotes = [];
            this.innerNotes = [];
            this.errorNotes = [];
        }
    }
    class SignaturePart extends FilePart {
        constructor(offset, bytes) {
            super(offset, bytes);
            this.outerNotes.push("Special: File signature");
            this.outerNotes.push(`Length: ${uintToStrWithThousandsSeparators(bytes.length)} bytes`);
            this.innerNotes.push(`\u201C${bytesToReadableString(bytes)}\u201D`);
            for (let i = 0; i < SignaturePart.FILE_SIGNATURE.length && this.errorNotes.length == 0; i++) {
                if (i >= bytes.length)
                    this.errorNotes.push("Premature EOF");
                else if (bytes[i] != SignaturePart.FILE_SIGNATURE[i])
                    this.errorNotes.push("Value mismatch");
            }
        }
    }
    SignaturePart.FILE_SIGNATURE = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    class UnknownPart extends FilePart {
        constructor(offset, bytes) {
            super(offset, bytes);
            this.outerNotes.push("Special: Unknown");
            this.outerNotes.push(`Length: ${uintToStrWithThousandsSeparators(bytes.length)} bytes`);
        }
    }
    class ChunkPart extends FilePart {
        constructor(offset, bytes) {
            super(offset, bytes);
            this.typeStr = "";
            this.isDataComplete = false;
            this.data = new Uint8Array();
            if (bytes.length < 4) {
                this.outerNotes.push("Data length: Unfinished");
                this.errorNotes.push("Premature EOF");
                return;
            }
            const dataLen = readUint32(bytes, 0);
            this.outerNotes.push(`Data length: ${uintToStrWithThousandsSeparators(dataLen)} bytes`);
            if (dataLen > ChunkPart.MAX_DATA_LENGTH)
                this.errorNotes.push("Length out of range");
            else if (bytes.length < dataLen + 12)
                this.errorNotes.push("Premature EOF");
            if (bytes.length < 8) {
                this.outerNotes.push("Type: Unfinished");
                return;
            }
            {
                const typeBytes = bytes.subarray(4, 8);
                this.typeStr = bytesToReadableString(typeBytes);
                if (!/^[A-Za-z]{4}$/.test(this.typeStr))
                    this.errorNotes.push("Type contains non-alphabetic characters");
                const typeInfo = this.getTypeInfo();
                if (typeInfo !== null) {
                    let frag = document.createDocumentFragment();
                    frag.append("Type: ");
                    let a = requireType(appendElem(frag, "a", this.typeStr), HTMLAnchorElement);
                    a.href = typeInfo[2];
                    a.target = "_blank";
                    this.outerNotes.push(frag);
                }
                else
                    this.outerNotes.push("Type: " + this.typeStr);
                const typeName = typeInfo !== null ? typeInfo[0] : "Unknown";
                this.outerNotes.push("Name: " + typeName, (typeBytes[0] & 0x20) == 0 ? "Critical (0)" : "Ancillary (1)", (typeBytes[1] & 0x20) == 0 ? "Public (0)" : "Private (1)", (typeBytes[2] & 0x20) == 0 ? "Reserved (0)" : "Unknown (1)", (typeBytes[3] & 0x20) == 0 ? "Unsafe to copy (0)" : "Safe to copy (1)");
            }
            if (dataLen > ChunkPart.MAX_DATA_LENGTH)
                return;
            if (bytes.length < dataLen + 12)
                this.outerNotes.push("CRC-32: Unfinished");
            else {
                const storedCrc = readUint32(bytes, bytes.length - 4);
                this.outerNotes.push(`CRC-32: ${storedCrc.toString(16).padStart(8, "0").toUpperCase()}`);
                const dataCrc = calcCrc32(bytes.subarray(4, bytes.length - 4));
                if (dataCrc != storedCrc)
                    this.errorNotes.push(`CRC-32 mismatch (calculated from data: ${dataCrc.toString(16).padStart(8, "0").toUpperCase()})`);
            }
            this.isDataComplete = 8 + dataLen <= bytes.length;
            this.data = bytes.subarray(8, Math.min(8 + dataLen, bytes.length));
        }
        annotate(earlierChunks) {
            if (this.innerNotes.length > 0)
                throw new Error("Already annotated");
            if (!this.isDataComplete)
                return;
            const temp = this.getTypeInfo();
            if (temp !== null)
                temp[3](this, earlierChunks);
        }
        getTypeInfo() {
            let result = null;
            for (const [type, name, multiple, url, func] of ChunkPart.TYPE_HANDLERS) {
                if (type == this.typeStr) {
                    if (result !== null)
                        throw new Error("Table has duplicate keys");
                    result = [name, multiple, url, func];
                }
            }
            return result;
        }
        /*---- Helper functions ----*/
        static getValidIhdrData(chunks) {
            let result = null;
            let count = 0;
            for (const chunk of chunks) {
                if (chunk.typeStr == "IHDR") {
                    count++;
                    if (chunk.data.length == 13)
                        result = chunk.data;
                }
            }
            if (count != 1)
                result = null;
            return result;
        }
        static getValidPlteNumEntries(chunks) {
            let result = null;
            let count = 0;
            for (const chunk of chunks) {
                if (chunk.typeStr == "PLTE") {
                    count++;
                    if (chunk.data.length % 3 == 0) {
                        const numEntries = chunk.data.length / 3;
                        if (1 <= numEntries && numEntries <= 256)
                            result = numEntries;
                    }
                }
            }
            if (count != 1)
                result = null;
            return result;
        }
        static getSpltNames(chunks) {
            let result = new Set();
            for (const chunk of chunks) {
                if (chunk.typeStr == "sPLT") {
                    const parts = splitByNull(chunk.data, 2);
                    result.add(decodeIso8859_1(parts[0]));
                }
            }
            return result;
        }
    }
    // The maximum length of a chunk's payload data, in bytes, inclusive.
    ChunkPart.MAX_DATA_LENGTH = 2147483647;
    /*---- Handlers and metadata for all known PNG chunk types ----*/
    ChunkPart.TYPE_HANDLERS = [
        ["acTL", "Animation control", false, "https://wiki.mozilla.org/APNG_Specification#.60acTL.60:_The_Animation_Control_Chunk", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                addErrorIfHasType(earlier, "fcTL", chunk, "Chunk must be before fcTL chunk");
                addErrorIfHasType(earlier, "fdAT", chunk, "Chunk must be before fdAT chunk");
                if (chunk.data.length != 8) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const numFrames = readUint32(chunk.data, 0);
                const numPlays = readUint32(chunk.data, 4);
                chunk.innerNotes.push(`Number of frames: ${numFrames}`);
                if (!(1 <= numFrames && numFrames <= 2147483647))
                    chunk.errorNotes.push("Number of frames out of range");
                chunk.innerNotes.push(`Number of plays: ${numPlays == 0 ? 'Infinite (0)' : numPlays}`);
                if (numPlays > 2147483647)
                    chunk.errorNotes.push("Number of plays out of range");
            }],
        ["bKGD", "Background color", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11bKGD", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                const ihdr = ChunkPart.getValidIhdrData(earlier);
                if (ihdr === null)
                    return;
                const bitDepth = ihdr[8];
                const colorType = ihdr[9];
                if (colorType == 3) {
                    if (chunk.data.length != 1) {
                        chunk.errorNotes.push("Invalid data length");
                        return;
                    }
                    const paletteIndex = chunk.data[0];
                    chunk.innerNotes.push(`Palette index: ${paletteIndex}`);
                    const plteNumEntries = ChunkPart.getValidPlteNumEntries(earlier);
                    if (plteNumEntries === null)
                        return;
                    if (paletteIndex >= plteNumEntries)
                        chunk.errorNotes.push("Color index out of range");
                }
                else {
                    if ((colorType == 0 || colorType == 4) && chunk.data.length != 2)
                        chunk.errorNotes.push("Invalid data length");
                    else if ((colorType == 2 || colorType == 6) && chunk.data.length != 6)
                        chunk.errorNotes.push("Invalid data length");
                    else {
                        if (colorType == 0 || colorType == 4)
                            chunk.innerNotes.push(`White: ${readUint16(chunk.data, 0)}`);
                        else if (colorType == 2 || colorType == 6) {
                            chunk.innerNotes.push(`Red: ${readUint16(chunk.data, 0)}`, `Green: ${readUint16(chunk.data, 2)}`, `Blue: ${readUint16(chunk.data, 4)}`);
                        }
                        for (let i = 0; i < chunk.data.length; i += 2) {
                            if (readUint16(chunk.data, i) >= (1 << bitDepth))
                                chunk.errorNotes.push("Color value out of range");
                        }
                    }
                }
            }],
        ["cHRM", "Primary chromaticities", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11cHRM", (chunk, earlier) => {
                addErrorIfHasType(earlier, "PLTE", chunk, "Chunk must be before PLTE chunk");
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length != 32) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                let offset = 0;
                for (const item of ["White point", "Red", "Green", "Blue"]) {
                    for (const axis of ["x", "y"]) {
                        const val = readUint32(chunk.data, offset);
                        let s = val.toString().padStart(6, "0");
                        s = s.substring(0, s.length - 5) + "." + s.substring(s.length - 5);
                        // s basically equals (val/100000).toFixed(5)
                        chunk.innerNotes.push(`${item} ${axis}: ${s}`);
                        if (val > 2147483647)
                            chunk.errorNotes.push(`${item} ${axis} value out of range`);
                        offset += 4;
                    }
                }
            }],
        ["dSIG", "Digital signature", true, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#RC.dSIG", (chunk, earlier) => { }],
        ["eXIf", "Exchangeable Image File (Exif) Profile", false, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.eXIf", (chunk, earlier) => { }],
        ["fcTL", "Frame control", true, "https://wiki.mozilla.org/APNG_Specification#.60fcTL.60:_The_Frame_Control_Chunk", (chunk, earlier) => {
                if (chunk.data.length != 26) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const sequence = readUint32(chunk.data, 0);
                const width = readUint32(chunk.data, 4);
                const height = readUint32(chunk.data, 8);
                const xOffset = readUint32(chunk.data, 12);
                const yOffset = readUint32(chunk.data, 16);
                const delayNumerator = readUint16(chunk.data, 20);
                const delayDenominator = readUint16(chunk.data, 22);
                const disposeOp = chunk.data[24];
                const blendOp = chunk.data[25];
                const effectiveDenominator = delayDenominator == 0 ? 100 : delayDenominator;
                let frag = document.createDocumentFragment();
                frag.append(`Delay: ${delayNumerator * 1000 % effectiveDenominator == 0 ? "" : "\u2248"}${(delayNumerator / effectiveDenominator).toFixed(3)} `);
                let abbr = appendElem(frag, "abbr", "s");
                abbr.title = "seconds";
                chunk.innerNotes.push(`Sequence number: ${sequence}`, `Width: ${width} pixels`, `Height: ${height} pixels`, `X offset: ${xOffset} pixels`, `Y offset: ${yOffset} pixels`, `Delay numerator: ${delayNumerator}`, `Delay denominator: ${delayDenominator == 0 ? "100 (0)" : delayDenominator}`, frag);
                if (sequence > 2147483647)
                    chunk.errorNotes.push("Sequence number out of range");
                const expectSequence = earlier.filter(ch => ch.typeStr == "fcTL" || ch.typeStr == "fdAT").length;
                if (sequence != expectSequence)
                    chunk.errorNotes.push(`Invalid sequence number (should be ${expectSequence})`);
                let widthMin = 1, widthMax = 2147483647;
                let heightMin = 1, heightMax = 2147483647;
                let xOffsetMin = 0, xOffsetMax = 2147483647;
                let yOffsetMin = 0, yOffsetMax = 2147483647;
                const ihdr = ChunkPart.getValidIhdrData(earlier);
                if (ihdr !== null) {
                    widthMax = readUint32(ihdr, 0);
                    heightMax = readUint32(ihdr, 4);
                    if (expectSequence == 0 && !earlier.some(ch => ch.typeStr == "IDAT")) { // This foremost fcTL is in front of IDAT
                        widthMin = widthMax;
                        heightMin = heightMax;
                        xOffsetMax = 0;
                        yOffsetMax = 0;
                    }
                    else {
                        xOffsetMax = widthMax - width;
                        yOffsetMax = heightMax - height;
                    }
                }
                if (!(widthMin <= width && width <= widthMax))
                    chunk.errorNotes.push("Width out of range");
                if (!(heightMin <= height && height <= heightMax))
                    chunk.errorNotes.push("Height out of range");
                if (!(xOffsetMin <= xOffset && xOffset <= xOffsetMax))
                    chunk.errorNotes.push("X offset out of range");
                if (!(yOffsetMin <= yOffset && yOffset <= yOffsetMax))
                    chunk.errorNotes.push("Y offset out of range");
                {
                    let s = lookUpTable(disposeOp, [
                        [0, "None"],
                        [1, "Background"],
                        [2, "Previous"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown dispose operation");
                    }
                    chunk.innerNotes.push(`Dispose operation: ${s} (${disposeOp})`);
                }
                {
                    let s = lookUpTable(blendOp, [
                        [0, "Source"],
                        [1, "Over"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown blend operation");
                    }
                    chunk.innerNotes.push(`Blend operation: ${s} (${blendOp})`);
                }
            }],
        ["fdAT", "Frame data", true, "https://wiki.mozilla.org/APNG_Specification#.60fdAT.60:_The_Frame_Data_Chunk", (chunk, earlier) => {
                if (chunk.data.length < 4) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const sequence = readUint32(chunk.data, 0);
                chunk.innerNotes.push(`Sequence number: ${sequence}`);
                if (sequence > 2147483647)
                    chunk.errorNotes.push("Sequence number out of range");
                chunk.innerNotes.push(`Frame data length: ${chunk.data.length - 4} bytes`);
            }],
        ["fRAc", "Fractal image parameters", true, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#RC.fRAc", (chunk, earlier) => { }],
        ["gAMA", "Image gamma", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11gAMA", (chunk, earlier) => {
                addErrorIfHasType(earlier, "PLTE", chunk, "Chunk must be before PLTE chunk");
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length != 4) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const gamma = readUint32(chunk.data, 0);
                let s = gamma.toString().padStart(6, "0");
                s = s.substring(0, s.length - 5) + "." + s.substring(s.length - 5);
                // s basically equals (gamma/100000).toFixed(5)
                chunk.innerNotes.push(`Gamma: ${s}`);
                if (gamma > 2147483647)
                    chunk.errorNotes.push("Gamma value out of range");
            }],
        ["gIFg", "GIF Graphic Control Extension", true, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.gIFg", (chunk, earlier) => {
                if (chunk.data.length != 4) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const disposalMethod = chunk.data[0];
                const userInputFlag = chunk.data[1];
                const delayTime = readUint16(chunk.data, 2);
                chunk.innerNotes.push(`Disposal method: ${disposalMethod}`);
                chunk.innerNotes.push(`User input flag: ${userInputFlag}`);
                let s = delayTime.toString().padStart(3, "0");
                s = s.substring(0, s.length - 2) + "." + s.substring(s.length - 2);
                // s basically equals (delayTime/100).toFixed(2)
                chunk.innerNotes.push(`Delay time: ${s} s`);
            }],
        ["gIFt", "GIF Plain Text Extension", true, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#DC.gIFt", (chunk, earlier) => {
                if (chunk.data.length < 24) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const gridLeft = readInt32(chunk.data, 0);
                const gridTop = readInt32(chunk.data, 4);
                const gridWidth = readInt32(chunk.data, 8);
                const gridHeight = readInt32(chunk.data, 12);
                const cellWidth = chunk.data[16];
                const cellHeight = chunk.data[17];
                const foregroundColor = chunk.data[18] << 16 | chunk.data[19] << 8 | chunk.data[20] << 0;
                const backgroundColor = chunk.data[21] << 16 | chunk.data[22] << 8 | chunk.data[23] << 0;
                const text = bytesToReadableString(chunk.data.subarray(24));
                chunk.innerNotes.push(`Deprecated`, `Text grid left position: ${gridLeft.toString().replace(/-/, "\u2212")}`, `Text grid top position: ${gridTop.toString().replace(/-/, "\u2212")}`, `Text grid width: ${gridWidth.toString().replace(/-/, "\u2212")}`, `Text grid height: ${gridHeight.toString().replace(/-/, "\u2212")}`, `Character cell width: ${cellWidth}`, `Character cell height: ${cellHeight}`, `Text foreground color: #${foregroundColor.toString(16).padStart(2, "0")}`, `Text background color: #${backgroundColor.toString(16).padStart(2, "0")}`, `Plain text data: ${text}`);
                if (gridLeft == -2147483648)
                    chunk.errorNotes.push("Text grid left position out of range");
                if (gridTop == -2147483648)
                    chunk.errorNotes.push("Text grid top position out of range");
                if (gridWidth == -2147483648)
                    chunk.errorNotes.push("Text grid width out of range");
                if (gridHeight == -2147483648)
                    chunk.errorNotes.push("Text grid height out of range");
            }],
        ["gIFx", "GIF Application Extension", true, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.gIFx", (chunk, earlier) => {
                if (chunk.data.length < 11) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                chunk.innerNotes.push(`Application identifier: ${bytesToReadableString(chunk.data.subarray(0, 8))}`);
                {
                    let hex = [];
                    for (let i = 0; i < 3; i++)
                        hex.push(chunk.data[8 + i].toString(16).padStart(2, "0"));
                    chunk.innerNotes.push(`Authentication code: ${hex.join(" ")}`);
                }
                {
                    let hex = [];
                    for (const b of chunk.data.subarray(11))
                        hex.push(b.toString(16).padStart(2, "0"));
                    chunk.innerNotes.push(`Application data: ${hex.join(" ")}`);
                }
            }],
        ["hIST", "Image histogram", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11hIST", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (!earlier.some(ch => ch.typeStr == "PLTE"))
                    chunk.errorNotes.push("Chunk requires earlier PLTE chunk");
                if (chunk.data.length % 2 != 0) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const numEntries = chunk.data.length / 2;
                chunk.innerNotes.push(`Number of entries: ${numEntries}`);
                const plteNumEntries = ChunkPart.getValidPlteNumEntries(earlier);
                if (plteNumEntries === null)
                    return;
                if (numEntries != plteNumEntries)
                    chunk.errorNotes.push("Invalid data length");
            }],
        ["iCCP", "Embedded ICC profile", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11iCCP", (chunk, earlier) => {
                addErrorIfHasType(earlier, "PLTE", chunk, "Chunk must be before PLTE chunk");
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                addErrorIfHasType(earlier, "sRGB", chunk, "Chunk should not exist because sRGB chunk exists");
                const parts = splitByNull(chunk.data, 2);
                const name = decodeIso8859_1(parts[0]);
                annotateTextKeyword(name, false, "Profile name", "name", chunk);
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                if (parts[1].length < 1) {
                    chunk.errorNotes.push("Missing compression method");
                    return;
                }
                const compMeth = parts[1][0];
                let s = lookUpTable(compMeth, COMPRESSION_METHODS);
                if (s === null) {
                    s = "Unknown";
                    chunk.errorNotes.push("Unknown compression method");
                }
                chunk.innerNotes.push(`Compression method: ${s} (${compMeth})`);
                const compProfile = parts[1].slice(1);
                chunk.innerNotes.push(`Compressed profile size: ${compProfile.length}`);
                if (compMeth == 0) {
                    try {
                        const decompProfile = decompressZlibDeflate(compProfile);
                        chunk.innerNotes.push(`Decompressed profile size: ${decompProfile.length}`);
                    }
                    catch (e) {
                        chunk.errorNotes.push("Profile decompression error: " + e.message);
                    }
                }
            }],
        ["IDAT", "Image data", true, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11IDAT", (chunk, earlier) => {
                if (earlier.length > 0 && earlier[earlier.length - 1].typeStr != "IDAT"
                    && earlier.some(ch => ch.typeStr == "IDAT")) {
                    chunk.errorNotes.push("Non-consecutive IDAT chunk");
                }
            }],
        ["IEND", "Image trailer", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11IEND", (chunk, earlier) => {
                if (chunk.data.length != 0)
                    chunk.errorNotes.push("Non-empty data");
            }],
        ["IHDR", "Image header", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11IHDR", (chunk, earlier) => {
                if (chunk.data.length != 13) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const width = readUint32(chunk.data, 0);
                const height = readUint32(chunk.data, 4);
                const bitDepth = chunk.data[8];
                const colorType = chunk.data[9];
                const compMeth = chunk.data[10];
                const filtMeth = chunk.data[11];
                const laceMeth = chunk.data[12];
                chunk.innerNotes.push(`Width: ${width} pixels`);
                if (width == 0 || width > 2147483647)
                    chunk.errorNotes.push("Width out of range");
                chunk.innerNotes.push(`Height: ${height} pixels`);
                if (height == 0 || height > 2147483647)
                    chunk.errorNotes.push("Height out of range");
                {
                    let colorTypeStr;
                    let validBitDepths;
                    const temp = lookUpTable(colorType, [
                        [0, ["Grayscale", [1, 2, 4, 8, 16]]],
                        [2, ["RGB", [8, 16]]],
                        [3, ["Palette", [1, 2, 4, 8]]],
                        [4, ["Grayscale+Alpha", [8, 16]]],
                        [6, ["RGBA", [8, 16]]],
                    ]);
                    colorTypeStr = temp !== null ? temp[0] : "Unknown";
                    validBitDepths = temp !== null ? temp[1] : [];
                    chunk.innerNotes.push(`Bit depth: ${bitDepth} bits per ${colorType != 3 ? "channel" : "pixel"}`);
                    chunk.innerNotes.push(`Color type: ${colorTypeStr} (${colorType})`);
                    if (temp === null)
                        chunk.errorNotes.push("Unknown color type");
                    else if (!validBitDepths.includes(bitDepth))
                        chunk.errorNotes.push("Invalid bit depth");
                }
                {
                    let s = lookUpTable(compMeth, COMPRESSION_METHODS);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown compression method");
                    }
                    chunk.innerNotes.push(`Compression method: ${s} (${compMeth})`);
                }
                {
                    let s = lookUpTable(filtMeth, [
                        [0, "Adaptive"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown filter method");
                    }
                    chunk.innerNotes.push(`Filter method: ${s} (${filtMeth})`);
                }
                {
                    let s = lookUpTable(laceMeth, [
                        [0, "None"],
                        [1, "Adam7"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown interlace method");
                    }
                    chunk.innerNotes.push(`Interlace method: ${s} (${laceMeth})`);
                }
            }],
        ["iTXt", "International textual data", true, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11iTXt", (chunk, earlier) => {
                let parts = splitByNull(chunk.data, 2);
                const keyword = decodeIso8859_1(parts[0]);
                annotateTextKeyword(keyword, true, "Keyword", "keyword", chunk);
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                if (parts[1].length < 1) {
                    chunk.errorNotes.push("Missing compression flag");
                    return;
                }
                const compFlag = parts[1][0];
                {
                    let s = lookUpTable(compFlag, [
                        [0, "Uncompressed"],
                        [1, "Compressed"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown compression flag");
                    }
                    chunk.innerNotes.push(`Compression flag: ${s} (${compFlag})`);
                }
                if (parts[1].length < 2) {
                    chunk.errorNotes.push("Missing compression method");
                    return;
                }
                let compMeth = parts[1][1];
                {
                    let s = null;
                    if (compFlag == 0 && compMeth == 0)
                        s = "Uncompressed";
                    else if (compFlag == 1)
                        s = lookUpTable(compMeth, COMPRESSION_METHODS);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown compression method");
                    }
                    chunk.innerNotes.push(`Compression method: ${s} (${compMeth})`);
                }
                parts = splitByNull(parts[1].slice(2), 3);
                {
                    const langTag = decodeIso8859_1(parts[0]);
                    chunk.innerNotes.push(`Language tag: ${langTag}`);
                    if (!/^(?:[A-Za-z0-9]{1,8}(?:-[A-Za-z0-9]{1,8})*)?$/.test(langTag))
                        chunk.errorNotes.push("Invalid language tax syntax");
                }
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                try {
                    const transKey = decodeUtf8(parts[1]);
                    chunk.innerNotes.push(`Translated keyword: ${transKey}`);
                }
                catch (e) {
                    chunk.errorNotes.push("Invalid UTF-8 in translated keyword");
                }
                if (parts.length == 2) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                let textBytes = null;
                switch (compFlag) {
                    case 0: // Uncompressed
                        textBytes = parts[2];
                        break;
                    case 1:
                        if (compMeth == 0) {
                            try {
                                textBytes = decompressZlibDeflate(parts[2]);
                            }
                            catch (e) {
                                chunk.errorNotes.push("Text decompression error: " + e.message);
                            }
                        }
                        break;
                }
                if (textBytes === null)
                    return;
                try {
                    const text = decodeUtf8(textBytes);
                    let frag = document.createDocumentFragment();
                    frag.append("Text string: ");
                    let span = appendElem(frag, "span", text);
                    span.style.wordBreak = "break-all";
                    chunk.innerNotes.push(frag);
                }
                catch (e) {
                    chunk.errorNotes.push("Invalid UTF-8 in text string");
                }
            }],
        ["oFFs", "Image offset", false, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.oFFs", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length != 9) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const xPos = readInt32(chunk.data, 0);
                const yPos = readInt32(chunk.data, 4);
                const unit = chunk.data[8];
                chunk.innerNotes.push(`X position: ${xPos.toString().replace(/-/, "\u2212")} units`);
                chunk.innerNotes.push(`Y position: ${yPos.toString().replace(/-/, "\u2212")} units`);
                if (xPos == -2147483648)
                    chunk.errorNotes.push("X position out of range");
                if (yPos == -2147483648)
                    chunk.errorNotes.push("Y position out of range");
                {
                    let s = lookUpTable(unit, [
                        [0, "Pixel"],
                        [1, "Micrometre"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown unit specifier");
                    }
                    chunk.innerNotes.push(`Unit specifier: ${s} (${unit})`);
                }
            }],
        ["pCAL", "Calibration of pixel values", false, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.pCAL", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                let parts = splitByNull(chunk.data, 2);
                const calibrationName = decodeIso8859_1(parts[0]);
                annotateTextKeyword(calibrationName, true, "Calibration name", "name", chunk);
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                const originalZero = readInt32(parts[1], 0);
                const originalMax = readInt32(parts[1], 4);
                chunk.innerNotes.push(`Original zero: ${originalZero.toString().replace(/-/, "\u2212")}`);
                chunk.innerNotes.push(`Original max: ${originalMax.toString().replace(/-/, "\u2212")}`);
                if (originalZero == -2147483648)
                    chunk.errorNotes.push("Original zero out of range");
                if (originalMax == -2147483648)
                    chunk.errorNotes.push("Original max out of range");
                if (originalZero == originalMax)
                    chunk.errorNotes.push("Zero original range");
                const equationType = parts[1][8];
                let s = lookUpTable(equationType, [
                    [0, "Linear"],
                    [1, "Base-e exponential"],
                    [2, "Arbitrary-base exponential"],
                    [3, "Hyperbolic"],
                ]);
                if (s === null) {
                    s = "Unknown";
                    chunk.errorNotes.push("Unknown equation type");
                }
                if (equationType != 1)
                    chunk.innerNotes.push(`Equation type: ${s} (${equationType})`);
                else {
                    let frag = document.createDocumentFragment();
                    frag.append("Equation type: Base-");
                    appendElem(frag, "var", "e");
                    frag.append(" exponential (1)");
                    chunk.innerNotes.push(frag);
                }
                const numParameters = parts[1][9];
                const expectNumParams = lookUpTable(equationType, [
                    [0, 2],
                    [1, 2],
                    [2, 3],
                    [3, 4],
                ]);
                if (expectNumParams !== null && expectNumParams != numParameters)
                    chunk.errorNotes.push("Invalid number of parameters for equation type");
                chunk.innerNotes.push(`Number of parameters: ${numParameters}`);
                parts = splitByNull(parts[1].slice(10), numParameters + 1);
                const unitName = decodeIso8859_1(parts[0]);
                chunk.innerNotes.push(`Unit name: ${unitName}`);
                if (unitName.includes("\uFFFD"))
                    chunk.errorNotes.push("Invalid ISO 8859-1 byte in unit name");
                parts.slice(1).forEach((part, i) => {
                    const param = decodeIso8859_1(part);
                    chunk.innerNotes.push(`Parameter ${i}: ${param}`);
                    if (!/^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(param))
                        chunk.errorNotes.push(`Invalid parameter ${i} floating-point string`);
                });
                if (parts.length != numParameters + 1)
                    chunk.errorNotes.push("Missing null separator");
            }],
        ["pHYs", "Physical pixel dimensions", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11pHYs", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length != 9) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const horzRes = readUint32(chunk.data, 0);
                const vertRes = readUint32(chunk.data, 4);
                const unit = chunk.data[8];
                for (const [dir, val] of [["Horizontal", horzRes], ["Vertical", vertRes]]) {
                    let frag = document.createDocumentFragment();
                    frag.append(`${dir} resolution: ${val} pixels per unit`);
                    if (unit == 1) {
                        frag.append(` (\u2248 ${(val * 0.0254).toFixed(0)} `);
                        let abbr = appendElem(frag, "abbr", "DPI");
                        abbr.title = "dots per inch";
                        frag.append(")");
                    }
                    chunk.innerNotes.push(frag);
                    if (val > 2147483647)
                        chunk.errorNotes.push(dir + " resolution out of range");
                }
                {
                    let s = lookUpTable(unit, [
                        [0, "Arbitrary (aspect ratio only)"],
                        [1, "Metre"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown unit specifier");
                    }
                    chunk.innerNotes.push(`Unit specifier: ${s} (${unit})`);
                }
            }],
        ["PLTE", "Palette", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11PLTE", (chunk, earlier) => {
                addErrorIfHasType(earlier, "bKGD", chunk, "Chunk must be before bKGD chunk");
                addErrorIfHasType(earlier, "hIST", chunk, "Chunk must be before hIST chunk");
                addErrorIfHasType(earlier, "tRNS", chunk, "Chunk must be before tRNS chunk");
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length % 3 != 0) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const numEntries = Math.ceil(chunk.data.length / 3);
                chunk.innerNotes.push(`Number of entries: ${numEntries}`);
                if (numEntries == 0)
                    chunk.errorNotes.push("Empty palette");
                const ihdr = ChunkPart.getValidIhdrData(earlier);
                if (ihdr === null)
                    return;
                const bitDepth = ihdr[8];
                const colorType = ihdr[9];
                if (colorType == 0 || colorType == 4)
                    chunk.errorNotes.push("Palette disallowed for grayscale color type");
                if (colorType == 3 && numEntries > (1 << bitDepth))
                    chunk.errorNotes.push("Number of palette entries exceeds bit depth");
            }],
        ["sCAL", "Physical scale of image subject", false, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.sCAL", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length < 1) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                {
                    const unit = chunk.data[0];
                    let s = lookUpTable(unit, [
                        [0, "Metre"],
                        [1, "Radian"],
                    ]);
                    if (s === null) {
                        s = "Unknown";
                        chunk.errorNotes.push("Unknown unit specifier");
                    }
                    chunk.innerNotes.push(`Unit specifier: ${s} (${unit})`);
                }
                const parts = splitByNull(chunk.data.slice(1), 2);
                const ASCII_FLOAT = /^([+-]?)(\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/;
                {
                    const width = decodeIso8859_1(parts[0]);
                    chunk.innerNotes.push(`Pixel width: ${width} units`);
                    const match = ASCII_FLOAT.exec(width);
                    if (match === null)
                        chunk.errorNotes.push("Invalid width floating-point string");
                    else if (match[1] == "-" || !/[1-9]/.test(match[2]))
                        chunk.errorNotes.push("Non-positive width");
                }
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                {
                    const height = decodeIso8859_1(parts[1]);
                    chunk.innerNotes.push(`Pixel height: ${height} units`);
                    const match = ASCII_FLOAT.exec(height);
                    if (match === null)
                        chunk.errorNotes.push("Invalid height floating-point string");
                    else if (match[1] == "-" || !/[1-9]/.test(match[2]))
                        chunk.errorNotes.push("Non-positive height");
                }
            }],
        ["sBIT", "Significant bits", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11sBIT", (chunk, earlier) => {
                addErrorIfHasType(earlier, "PLTE", chunk, "Chunk must be before PLTE chunk");
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                const ihdr = ChunkPart.getValidIhdrData(earlier);
                if (ihdr === null)
                    return;
                const colorType = ihdr[9];
                const bitDepth = colorType != 3 ? ihdr[8] : 8;
                const channels = lookUpTable(colorType, [
                    [0, ["White"]],
                    [2, ["Red", "Green", "Blue"]],
                    [3, ["Red", "Green", "Blue"]],
                    [4, ["White", "Alpha"]],
                    [6, ["Red", "Green", "Blue", "Alpha"]],
                ]);
                if (channels === null)
                    return;
                if (chunk.data.length != channels.length) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                let hasChanErr = false;
                channels.forEach((chan, i) => {
                    const bits = chunk.data[i];
                    chunk.innerNotes.push(`${chan} bits: ${bits}`);
                    if (!hasChanErr && !(1 <= bits && bits <= bitDepth)) {
                        chunk.errorNotes.push("Bit depth out of range");
                        hasChanErr = true;
                    }
                });
            }],
        ["sPLT", "Suggested palette", true, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11sPLT", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                const parts = splitByNull(chunk.data, 2);
                const name = decodeIso8859_1(parts[0]);
                annotateTextKeyword(name, true, "Palette name", "name", chunk);
                if (ChunkPart.getSpltNames(earlier).has(name))
                    chunk.errorNotes.push("Duplicate palette name");
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                if (parts[1].length < 1) {
                    chunk.errorNotes.push("Missing sample depth");
                    return;
                }
                const sampDepth = parts[1][0];
                chunk.innerNotes.push(`Sample depth: ${sampDepth}`);
                const bytesPerEntry = lookUpTable(sampDepth, [
                    [8, 6],
                    [16, 10],
                ]);
                if (bytesPerEntry === null)
                    return;
                else if ((parts[1].length - 1) % bytesPerEntry == 0)
                    chunk.innerNotes.push(`Number of entries: ${(parts[1].length - 1) / bytesPerEntry}`);
                else
                    chunk.errorNotes.push("Invalid data length");
            }],
        ["sRGB", "Standard RGB color space", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11sRGB", (chunk, earlier) => {
                addErrorIfHasType(earlier, "PLTE", chunk, "Chunk must be before PLTE chunk");
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                addErrorIfHasType(earlier, "iCCP", chunk, "Chunk should not exist because iCCP chunk exists");
                if (chunk.data.length != 1) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const renderIntent = chunk.data[0];
                let s = lookUpTable(renderIntent, [
                    [0, "Perceptual"],
                    [1, "Relative colorimetric"],
                    [2, "Saturation"],
                    [3, "Absolute colorimetric"],
                ]);
                if (s === null) {
                    s = "Unknown";
                    chunk.errorNotes.push("Unknown rendering intent");
                }
                chunk.innerNotes.push(`Rendering intent: ${s} (${renderIntent})`);
            }],
        ["sTER", "Indicator of Stereo Image", false, "https://ftp-osl.osuosl.org/pub/libpng/documents/pngext-1.5.0.html#C.sTER", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                if (chunk.data.length != 1) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const mode = chunk.data[0];
                let s = lookUpTable(mode, [
                    [0, "Cross-fuse layout"],
                    [1, "Diverging-fuse layout"],
                ]);
                if (s === null) {
                    s = "Unknown";
                    chunk.errorNotes.push("Unknown mode");
                }
                chunk.innerNotes.push(`Mode: ${s} (${mode})`);
            }],
        ["tEXt", "Textual data", true, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11tEXt", (chunk, earlier) => {
                const parts = splitByNull(chunk.data, 2);
                const keyword = decodeIso8859_1(parts[0]);
                annotateTextKeyword(keyword, true, "Keyword", "keyword", chunk);
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                const text = decodeIso8859_1(parts[1]);
                chunk.innerNotes.push(`Text string: ${text}`);
                if (text.includes("\u0000"))
                    chunk.errorNotes.push("Null character in text string");
                if (text.includes("\uFFFD"))
                    chunk.errorNotes.push("Invalid ISO 8859-1 byte in text string");
            }],
        ["tIME", "Image last-modification time", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11tIME", (chunk, earlier) => {
                if (chunk.data.length != 7) {
                    chunk.errorNotes.push("Invalid data length");
                    return;
                }
                const year = readUint16(chunk.data, 0);
                const month = chunk.data[2];
                const day = chunk.data[3];
                const hour = chunk.data[4];
                const minute = chunk.data[5];
                const second = chunk.data[6];
                chunk.innerNotes.push(`Year: ${year}`, `Month: ${month}`, `Day: ${day}`, `Hour: ${hour}`, `Minute: ${minute}`, `Second: ${second}`);
                if (!(1 <= month && month <= 12))
                    chunk.errorNotes.push("Invalid month");
                if (!(1 <= day && day <= 31) || 1 <= month && month <= 12 && day > new Date(year, month, 0).getDate())
                    chunk.errorNotes.push("Invalid day");
                if (!(0 <= hour && hour <= 23))
                    chunk.errorNotes.push("Invalid hour");
                if (!(0 <= minute && minute <= 59))
                    chunk.errorNotes.push("Invalid minute");
                if (!(0 <= second && second <= 60))
                    chunk.errorNotes.push("Invalid second");
            }],
        ["tRNS", "Transparency", false, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11tRNS", (chunk, earlier) => {
                addErrorIfHasType(earlier, "IDAT", chunk, "Chunk must be before IDAT chunk");
                const ihdr = ChunkPart.getValidIhdrData(earlier);
                if (ihdr === null)
                    return;
                const bitDepth = ihdr[8];
                const colorType = ihdr[9];
                if (colorType == 4)
                    chunk.errorNotes.push("Transparency chunk disallowed for gray+alpha color type");
                else if (colorType == 6)
                    chunk.errorNotes.push("Transparency chunk disallowed for RGBA color type");
                else if (colorType == 3) {
                    const numEntries = chunk.data.length;
                    chunk.innerNotes.push(`Number of entries: ${numEntries}`);
                    const plteNumEntries = ChunkPart.getValidPlteNumEntries(earlier);
                    if (plteNumEntries === null)
                        return;
                    if (numEntries > plteNumEntries)
                        chunk.errorNotes.push("Number of alpha values exceeds palette size");
                }
                else {
                    if (colorType == 0 && chunk.data.length != 2)
                        chunk.errorNotes.push("Invalid data length");
                    else if (colorType == 2 && chunk.data.length != 6)
                        chunk.errorNotes.push("Invalid data length");
                    else {
                        if (colorType == 0)
                            chunk.innerNotes.push(`White: ${readUint16(chunk.data, 0)}`);
                        else if (colorType == 2) {
                            chunk.innerNotes.push(`Red: ${readUint16(chunk.data, 0)}`, `Green: ${readUint16(chunk.data, 2)}`, `Blue: ${readUint16(chunk.data, 4)}`);
                        }
                        for (let i = 0; i < chunk.data.length; i += 2) {
                            if (readUint16(chunk.data, i) >= (1 << bitDepth))
                                chunk.errorNotes.push("Color value out of range");
                        }
                    }
                }
            }],
        ["zTXt", "Compressed textual data", true, "https://www.w3.org/TR/2003/REC-PNG-20031110/#11zTXt", (chunk, earlier) => {
                const parts = splitByNull(chunk.data, 2);
                const keyword = decodeIso8859_1(parts[0]);
                annotateTextKeyword(keyword, true, "Keyword", "keyword", chunk);
                if (parts.length == 1) {
                    chunk.errorNotes.push("Missing null separator");
                    return;
                }
                if (parts[1].length < 1) {
                    chunk.errorNotes.push("Missing compression method");
                    return;
                }
                const compMeth = parts[1][0];
                let s = lookUpTable(compMeth, COMPRESSION_METHODS);
                if (s === null) {
                    s = "Unknown";
                    chunk.errorNotes.push("Unknown compression method");
                }
                chunk.innerNotes.push(`Compression method: ${s} (${compMeth})`);
                if (compMeth == 0) {
                    try {
                        const textBytes = decompressZlibDeflate(parts[1].slice(1));
                        const text = decodeIso8859_1(textBytes);
                        let frag = document.createDocumentFragment();
                        frag.append("Text string: ");
                        let span = appendElem(frag, "span", text);
                        span.style.wordBreak = "break-all";
                        chunk.innerNotes.push(frag);
                        if (text.includes("\uFFFD"))
                            chunk.errorNotes.push("Invalid ISO 8859-1 byte in text string");
                    }
                    catch (e) {
                        chunk.errorNotes.push("Text decompression error: " + e.message);
                    }
                }
            }],
    ];
    /*---- Utility functions ----*/
    const COMPRESSION_METHODS = [
        [0, "DEFLATE"],
    ];
    function annotateTextKeyword(keyword, checkSpaces, noteName, errorName, chunk) {
        chunk.innerNotes.push(`${noteName}: ${keyword}`);
        if (!(1 <= keyword.length && keyword.length <= 79))
            chunk.errorNotes.push(`Invalid ${errorName} length`);
        for (const ch of keyword) {
            const cc = ch.codePointAt(0);
            if (0x20 <= cc && cc <= 0x7E || 0xA1 <= cc && cc <= 0xFF)
                continue;
            else {
                chunk.errorNotes.push(`Invalid character in ${errorName}`);
                break;
            }
        }
        if (checkSpaces && /^ |  | $/.test(keyword))
            chunk.errorNotes.push(`Invalid space in ${errorName}`);
    }
    function calcCrc32(bytes) {
        let crc = ~0;
        for (const b of bytes) {
            for (let i = 0; i < 8; i++) {
                crc ^= (b >>> i) & 1;
                crc = (crc >>> 1) ^ (-(crc & 1) & 0xEDB88320);
            }
        }
        return ~crc >>> 0;
    }
    function bytesToReadableString(bytes) {
        let result = "";
        for (const b of bytes) {
            let cc = b;
            if (b < 0x20)
                cc += 0x2400;
            else if (b == 0x7F)
                cc = 0x2421;
            else if (0x80 <= b && b < 0xA0)
                cc = 0x25AF;
            result += String.fromCodePoint(cc);
        }
        return result;
    }
    function decodeIso8859_1(bytes) {
        let result = "";
        for (const b of bytes) {
            if (!(0x00 <= b && b <= 0xFF))
                throw new RangeError("Invalid byte");
            else if (0x80 <= b && b < 0xA0)
                result += "\uFFFD";
            else
                result += String.fromCodePoint(b); // ISO 8859-1 is a subset of Unicode
        }
        return result;
    }
    function decodeUtf8(bytes) {
        let temp = "";
        for (const b of bytes) {
            if (b == "%".codePointAt(0) || b >= 128)
                temp += "%" + b.toString(16).padStart(2, "0");
            else
                temp += String.fromCodePoint(b);
        }
        return decodeURI(temp);
    }
    function uintToStrWithThousandsSeparators(val) {
        if (val < 0 || Math.floor(val) != val)
            throw new RangeError("Invalid unsigned integer");
        let result = val.toString();
        for (let i = result.length - 3; i > 0; i -= 3)
            result = result.substring(0, i) + "\u00A0" + result.substring(i);
        return result;
    }
    function addErrorIfHasType(earlier, type, chunk, message) {
        if (earlier.some(ch => ch.typeStr == type))
            chunk.errorNotes.push(message);
    }
    function appendElem(container, tagName, text) {
        let result = document.createElement(tagName);
        container.append(result);
        if (text !== undefined)
            result.textContent = text;
        return result;
    }
    function lookUpTable(key, table) {
        let result = null;
        for (const [k, v] of table) {
            if (k == key) {
                if (result !== null)
                    throw new RangeError("Table has duplicate keys");
                result = v;
            }
        }
        return result;
    }
    function splitByNull(bytes, maxParts) {
        if (maxParts < 1)
            throw new RangeError("Non-positive number of parts");
        let result = [];
        let start = 0;
        for (let i = 0; i < maxParts - 1; i++) {
            let end = bytes.indexOf(0, start);
            if (end == -1)
                break;
            result.push(bytes.slice(start, end));
            start = end + 1;
        }
        result.push(bytes.slice(start));
        return result;
    }
    function decompressZlibDeflate(bytes) {
        if (bytes.length < 2)
            throw new RangeError("Invalid zlib container");
        const compMeth = bytes[0] & 0xF;
        const compInfo = bytes[0] >>> 4;
        const presetDict = (bytes[1] & 0x20) != 0;
        const compLevel = bytes[1] >>> 6;
        if ((bytes[0] << 8 | bytes[1]) % 31 != 0)
            throw new RangeError("zlib header checksum mismatch");
        if (compMeth != 8)
            throw new RangeError(`Unsupported compression method (${compMeth})`);
        if (compInfo > 7)
            throw new RangeError(`Unsupported compression info (${compInfo})`);
        if (presetDict)
            throw new RangeError("Unsupported preset dictionary");
        let input = new deflate.BitInputStream(bytes.slice(2));
        const result = deflate.Decompressor.decompress(input);
        let dataAdler;
        {
            let s1 = 1;
            let s2 = 0;
            for (const b of result) {
                s1 = (s1 + b) % 65521;
                s2 = (s2 + s1) % 65521;
            }
            dataAdler = s2 << 16 | s1;
        }
        let storedAdler = 0;
        for (let i = 0; i < 4; i++)
            storedAdler = storedAdler << 8 | input.readUint(8);
        if (storedAdler != dataAdler)
            throw new RangeError("Adler-32 mismatch");
        if (input.readBitMaybe() != -1)
            throw new RangeError("Unexpected data after zlib container");
        return result;
    }
    function readUint16(bytes, offset) {
        if (bytes.length - offset < 2)
            throw new RangeError("Index out of range");
        return bytes[offset + 0] << 8
            | bytes[offset + 1] << 0;
    }
    function readUint32(bytes, offset) {
        if (offset < 0 || bytes.length - offset < 4)
            throw new RangeError("Index out of range");
        return (bytes[offset + 0] << 24
            | bytes[offset + 1] << 16
            | bytes[offset + 2] << 8
            | bytes[offset + 3] << 0) >>> 0;
    }
    function readInt32(bytes, offset) {
        return readUint32(bytes, offset) | 0;
    }
    function requireType(val, type) {
        if (val instanceof type)
            return val;
        else
            throw new TypeError("Invalid value type");
    }
})(app || (app = {}));
/*
 * Simple DEFLATE decompressor (compiled from TypeScript)
 *
 * Copyright (c) Project Nayuki
 * MIT License. See readme file.
 * https://www.nayuki.io/page/simple-deflate-decompressor
 */
var deflate;
(function (deflate) {
    /*
     * A canonical Huffman code, where the code values for each symbol is
     * derived from a given sequence of code lengths. This data structure is
     * immutable. This could be transformed into an explicit Huffman code tree.
     *
     * Example:
     *   Code lengths (canonical code):
     *     Symbol A: 1
     *     Symbol B: 0 (no code)
     *     Symbol C: 3
     *     Symbol D: 2
     *     Symbol E: 3
     *
     *   Generated Huffman codes:
     *     Symbol A: 0
     *     Symbol B: (Absent)
     *     Symbol C: 110
     *     Symbol D: 10
     *     Symbol E: 111
     *
     *   Huffman code tree:
     *       .
     *      / \
     *     A   .
     *        / \
     *       D   .
     *          / \
     *         C   E
     */
    class CanonicalCode {
        // Constructs a canonical Huffman code from the given list of symbol code lengths.
        // Each code length must be non-negative. Code length 0 means no code for the symbol.
        // The collection of code lengths must represent a proper full Huffman code tree.
        // Examples of code lengths that result in correct full Huffman code trees:
        // - [1, 1] (result: A=0, B=1)
        // - [2, 2, 1, 0, 0, 0] (result: A=10, B=11, C=0)
        // - [3, 3, 3, 3, 3, 3, 3, 3] (result: A=000, B=001, C=010, ..., H=111)
        // Examples of code lengths that result in under-full Huffman code trees:
        // - [0, 2, 0] (result: B=00, unused=01, unused=1)
        // - [0, 1, 0, 2] (result: B=0, D=10, unused=11)
        // Examples of code lengths that result in over-full Huffman code trees:
        // - [1, 1, 1] (result: A=0, B=1, C=overflow)
        // - [1, 1, 2, 2, 3, 3, 3, 3] (result: A=0, B=1, C=overflow, ...)
        constructor(codeLengths) {
            // This dictionary maps Huffman codes to symbol values. Each key is the
            // Huffman code padded with a 1 bit at the beginning to disambiguate codes
            // of different lengths (e.g. otherwise we can't distinguish 0b01 from
            // 0b0001). For the example of codeLengths=[1,0,3,2,3], we would have:
            //     0b1_0 -> 0
            //    0b1_10 -> 3
            //   0b1_110 -> 2
            //   0b1_111 -> 4
            this.codeBitsToSymbol = new Map();
            let nextCode = 0;
            for (let codeLength = 1; codeLength <= CanonicalCode.MAX_CODE_LENGTH; codeLength++) {
                nextCode <<= 1;
                const startBit = 1 << codeLength;
                codeLengths.forEach((cl, symbol) => {
                    if (cl != codeLength)
                        return;
                    if (nextCode >= startBit)
                        throw new RangeError("This canonical code produces an over-full Huffman code tree");
                    this.codeBitsToSymbol.set(startBit | nextCode, symbol);
                    nextCode++;
                });
            }
            if (nextCode != 1 << CanonicalCode.MAX_CODE_LENGTH)
                throw new RangeError("This canonical code produces an under-full Huffman code tree");
        }
        // Decodes the next symbol from the given bit input stream based on this
        // canonical code. The returned symbol value is in the range [0, codeLengths.size()).
        decodeNextSymbol(inp) {
            let codeBits = 1;
            while (true) {
                codeBits = codeBits << 1 | inp.readUint(1);
                const result = this.codeBitsToSymbol.get(codeBits);
                if (result !== undefined)
                    return result;
            }
        }
    }
    // The maximum Huffman code length allowed in the DEFLATE standard.
    CanonicalCode.MAX_CODE_LENGTH = 15;
    /*
     * Decompresses raw DEFLATE data (without zlib or gzip container) into bytes.
     */
    class Decompressor {
        // Constructor, which immediately performs decompression.
        constructor(input) {
            this.input = input;
            this.output = [];
            this.dictionary = new ByteHistory(32 * 1024);
            // Process the stream of blocks
            let isFinal;
            do {
                // Read the block header
                isFinal = this.input.readUint(1) != 0; // bfinal
                const type = this.input.readUint(2); // btype
                // Decompress rest of block based on the type
                if (type == 0)
                    this.decompressUncompressedBlock();
                else if (type == 1)
                    this.decompressHuffmanBlock(Decompressor.FIXED_LITERAL_LENGTH_CODE, Decompressor.FIXED_DISTANCE_CODE);
                else if (type == 2) {
                    const [litLenCode, distCode] = this.decodeHuffmanCodes();
                    this.decompressHuffmanBlock(litLenCode, distCode);
                }
                else if (type == 3)
                    throw new Error("Reserved block type");
                else
                    throw new Error("Unreachable value");
            } while (!isFinal);
            // Discard bits to align to byte boundary
            while (this.input.getBitPosition() != 0)
                this.input.readUint(1);
        }
        // Reads from the given input stream, decompresses the data, and returns a new byte array.
        static decompress(input) {
            return new Uint8Array(new Decompressor(input).output);
        }
        static makeFixedLiteralLengthCode() {
            let codeLens = [];
            for (let i = 0; i < 144; i++)
                codeLens.push(8);
            for (let i = 0; i < 112; i++)
                codeLens.push(9);
            for (let i = 0; i < 24; i++)
                codeLens.push(7);
            for (let i = 0; i < 8; i++)
                codeLens.push(8);
            return new CanonicalCode(codeLens);
        }
        static makeFixedDistanceCode() {
            let codeLens = [];
            for (let i = 0; i < 32; i++)
                codeLens.push(5);
            return new CanonicalCode(codeLens);
        }
        // Reads from the bit input stream, decodes the Huffman code
        // specifications into code trees, and returns the trees.
        decodeHuffmanCodes() {
            const numLitLenCodes = this.input.readUint(5) + 257; // hlit + 257
            const numDistCodes = this.input.readUint(5) + 1; // hdist + 1
            // Read the code length code lengths
            const numCodeLenCodes = this.input.readUint(4) + 4; // hclen + 4
            let codeLenCodeLen = []; // This array is filled in a strange order
            for (let i = 0; i < 19; i++)
                codeLenCodeLen.push(0);
            codeLenCodeLen[16] = this.input.readUint(3);
            codeLenCodeLen[17] = this.input.readUint(3);
            codeLenCodeLen[18] = this.input.readUint(3);
            codeLenCodeLen[0] = this.input.readUint(3);
            for (let i = 0; i < numCodeLenCodes - 4; i++) {
                const j = (i % 2 == 0) ? (8 + Math.floor(i / 2)) : (7 - Math.floor(i / 2));
                codeLenCodeLen[j] = this.input.readUint(3);
            }
            // Create the code length code
            const codeLenCode = new CanonicalCode(codeLenCodeLen);
            // Read the main code lengths and handle runs
            let codeLens = [];
            while (codeLens.length < numLitLenCodes + numDistCodes) {
                const sym = codeLenCode.decodeNextSymbol(this.input);
                if (0 <= sym && sym <= 15)
                    codeLens.push(sym);
                else if (sym == 16) {
                    if (codeLens.length == 0)
                        throw new Error("No code length value to copy");
                    const runLen = this.input.readUint(2) + 3;
                    for (let i = 0; i < runLen; i++)
                        codeLens.push(codeLens[codeLens.length - 1]);
                }
                else if (sym == 17) {
                    const runLen = this.input.readUint(3) + 3;
                    for (let i = 0; i < runLen; i++)
                        codeLens.push(0);
                }
                else if (sym == 18) {
                    const runLen = this.input.readUint(7) + 11;
                    for (let i = 0; i < runLen; i++)
                        codeLens.push(0);
                }
                else
                    throw new Error("Symbol out of range");
            }
            if (codeLens.length > numLitLenCodes + numDistCodes)
                throw new Error("Run exceeds number of codes");
            // Create literal-length code tree
            const litLenCodeLen = codeLens.slice(0, numLitLenCodes);
            if (litLenCodeLen[256] == 0)
                throw new Error("End-of-block symbol has zero code length");
            const litLenCode = new CanonicalCode(litLenCodeLen);
            // Create distance code tree with some extra processing
            let distCodeLen = codeLens.slice(numLitLenCodes);
            let distCode;
            if (distCodeLen.length == 1 && distCodeLen[0] == 0)
                distCode = null; // Empty distance code; the block shall be all literal symbols
            else {
                // Get statistics for upcoming logic
                const oneCount = distCodeLen.filter(x => x == 1).length;
                const otherPositiveCount = distCodeLen.filter(x => x > 1).length;
                // Handle the case where only one distance code is defined
                if (oneCount == 1 && otherPositiveCount == 0) {
                    while (distCodeLen.length < 32)
                        distCodeLen.push(0);
                    distCodeLen[31] = 1;
                }
                distCode = new CanonicalCode(distCodeLen);
            }
            return [litLenCode, distCode];
        }
        // Handles and copies an uncompressed block from the bit input stream.
        decompressUncompressedBlock() {
            // Discard bits to align to byte boundary
            while (this.input.getBitPosition() != 0)
                this.input.readUint(1);
            // Read length
            const len = this.input.readUint(16);
            const nlen = this.input.readUint(16);
            if ((len ^ 0xFFFF) != nlen)
                throw new Error("Invalid length in uncompressed block");
            // Copy bytes
            for (let i = 0; i < len; i++) {
                const b = this.input.readUint(8); // Byte is aligned
                this.output.push(b);
                this.dictionary.append(b);
            }
        }
        // Decompresses a Huffman-coded block from the bit input stream based on the given Huffman codes.
        decompressHuffmanBlock(litLenCode, distCode) {
            while (true) {
                const sym = litLenCode.decodeNextSymbol(this.input);
                if (sym == 256) // End of block
                    break;
                else if (sym < 256) { // Literal byte
                    this.output.push(sym);
                    this.dictionary.append(sym);
                }
                else { // Length and distance for copying
                    const run = this.decodeRunLength(sym);
                    if (!(3 <= run && run <= 258))
                        throw new Error("Invalid run length");
                    if (distCode === null)
                        throw new Error("Length symbol encountered with empty distance code");
                    const distSym = distCode.decodeNextSymbol(this.input);
                    const dist = this.decodeDistance(distSym);
                    if (!(1 <= dist && dist <= 32768))
                        throw new Error("Invalid distance");
                    this.dictionary.copy(dist, run, this.output);
                }
            }
        }
        // Returns the run length based on the given symbol and possibly reading more bits.
        decodeRunLength(sym) {
            // Symbols outside the range cannot occur in the bit stream;
            // they would indicate that the decompressor is buggy
            if (!(257 <= sym && sym <= 287))
                throw new RangeError("Invalid run length symbol");
            if (sym <= 264)
                return sym - 254;
            else if (sym <= 284) {
                const numExtraBits = Math.floor((sym - 261) / 4);
                return (((sym - 265) % 4 + 4) << numExtraBits) + 3 + this.input.readUint(numExtraBits);
            }
            else if (sym == 285)
                return 258;
            else // sym is 286 or 287
                throw new RangeError("Reserved length symbol");
        }
        // Returns the distance based on the given symbol and possibly reading more bits.
        decodeDistance(sym) {
            // Symbols outside the range cannot occur in the bit stream;
            // they would indicate that the decompressor is buggy
            if (!(0 <= sym && sym <= 31))
                throw new RangeError("Invalid distance symbol");
            if (sym <= 3)
                return sym + 1;
            else if (sym <= 29) {
                const numExtraBits = Math.floor(sym / 2) - 1;
                return ((sym % 2 + 2) << numExtraBits) + 1 + this.input.readUint(numExtraBits);
            }
            else // sym is 30 or 31
                throw new RangeError("Reserved distance symbol");
        }
    }
    Decompressor.FIXED_LITERAL_LENGTH_CODE = Decompressor.makeFixedLiteralLengthCode();
    Decompressor.FIXED_DISTANCE_CODE = Decompressor.makeFixedDistanceCode();
    deflate.Decompressor = Decompressor;
    /*
     * Stores a finite recent history of a byte stream. Useful as an implicit
     * dictionary for Lempel-Ziv schemes.
     */
    class ByteHistory {
        // Constructs a byte history of the given size.
        constructor(size) {
            // Circular buffer of byte data.
            this.data = [];
            // Index of next byte to write to, always in the range [0, data.length).
            this.index = 0;
            if (size < 1)
                throw new RangeError("Size must be positive");
            this.size = size;
        }
        // Appends the given byte to this history.
        // This overwrites the byte value at `size` positions ago.
        append(b) {
            if (this.data.length < this.size)
                this.data.push(0); // Dummy value
            if (!(0 <= this.index && this.index < this.data.length))
                throw new Error("Unreachable state");
            this.data[this.index] = b;
            this.index = (this.index + 1) % this.size;
        }
        // Copies `len` bytes starting at `dist` bytes ago to the
        // given output array and also back into this buffer itself.
        // Note that if the count exceeds the distance, then some of the output
        // data will be a copy of data that was copied earlier in the process.
        copy(dist, len, out) {
            if (len < 0 || !(1 <= dist && dist <= this.data.length))
                throw new RangeError("Invalid length or distance");
            let readIndex = (this.index + this.size - dist) % this.size;
            for (let i = 0; i < len; i++) {
                const b = this.data[readIndex];
                readIndex = (readIndex + 1) % this.size;
                out.push(b);
                this.append(b);
            }
        }
    }
    /*
     * A stream of bits that can be read. Because they come from an underlying byte stream, the
     * total number of bits is always a multiple of 8. Bits are packed in little endian within
     * a byte. For example, the byte 0x87 reads as the sequence of bits [1,1,1,0,0,0,0,1].
     */
    class BitInputStream {
        // Constructs a bit input stream based on the given byte array.
        constructor(data) {
            this.data = data;
            // In the range [0, data.length*8].
            this.bitIndex = 0;
        }
        // Returns the current bit position, which ascends from 0 to 7 as bits are read.
        getBitPosition() {
            return this.bitIndex % 8;
        }
        // Reads a bit from this stream. Returns 0 or 1 if a bit is available, or -1 if
        // the end of stream is reached. The end of stream always occurs on a byte boundary.
        readBitMaybe() {
            const byteIndex = this.bitIndex >>> 3;
            if (byteIndex >= this.data.length)
                return -1;
            const result = ((this.data[byteIndex] >>> (this.bitIndex & 7)) & 1);
            this.bitIndex++;
            return result;
        }
        // Reads the given number of bits from this stream,
        // packing them in little endian as an unsigned integer.
        readUint(numBits) {
            if (numBits < 0 || numBits > 31)
                throw new RangeError("Number of bits out of range");
            let result = 0;
            for (let i = 0; i < numBits; i++) {
                const bit = this.readBitMaybe();
                if (bit == -1)
                    throw new Error("Unexpected end of data");
                result |= bit << i;
            }
            return result;
        }
    }
    deflate.BitInputStream = BitInputStream;
})(deflate || (deflate = {}));
