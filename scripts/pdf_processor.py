#!/usr/bin/env python

import sys
import json
import pdfplumber
import re
import pandas as pd



import time

# Function to extract text from the PDF


def extract_text_from_pdf(pdf_path):
    extracted_text = []
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for i, page in enumerate(pdf.pages):
            # Report progress percentage
            # 50% of the job is text extraction
            progress = int((i + 1) / total_pages * 50)
            print(f"PROGRESS:{progress}", flush=True)

            text = page.extract_text()
            if text:
                extracted_text.append(text)
    return "\n".join(extracted_text)

# Function to parse and structure extracted data


def parse_cutoff_data(text):
    structured_data = []
    # Split by college sections
    college_blocks = re.split(r"\n(?=\d{4} - )", text)
    total_blocks = len(college_blocks)

    for i, block in enumerate(college_blocks):
        # Report progress for parsing phase
        progress = 50 + int((i + 1) / total_blocks * 50)  # 50-100% is parsing
        print(f"PROGRESS:{progress}", flush=True)

        # Extract College ID & Name
        college_match = re.search(r"(\d{4}) - (.+)", block)
        if not college_match:
            continue
        college_id, college_name = college_match.groups()

        # Extract all Branch IDs & Names in the block (handles IDs with letters)
        branch_matches = re.findall(r"(\d{9}[A-Z]?) - (.+)", block)

        for branch_match in branch_matches:
            branch_id, branch_name = branch_match

            # Extract Status (once per branch)
            status_match = re.search(r"Status: (.+)", block)
            status = status_match.group(1) if status_match else "Unknown"

            # Extract categories, ranks, and percentiles separately for each branch
            branch_data_match = re.search(
                rf"{branch_id} - {re.escape(branch_name)}(.+?)(?=\n\d{{9}}[A-Z]? - |\Z)", block, re.DOTALL)
            if not branch_data_match:
                continue

            branch_data = branch_data_match.group(1)

            # Extract Categories
            category_match = re.search(r"Stage\s+([\w\s]+)\n", branch_data)
            categories = category_match.group(
                1).split() if category_match else []

            # Extract Ranks
            rank_match = re.search(r"I\s+([\d\s]+)\n", branch_data)
            ranks = rank_match.group(1).split() if rank_match else []

            # Extract Percentiles
            percentiles = re.findall(r"\(([\d.]+)\)", branch_data)

            # Ensure all lists have the same length
            max_len = min(len(categories), len(ranks), len(percentiles))
            categories, ranks, percentiles = categories[:
                                                        max_len], ranks[:max_len], percentiles[:max_len]

            # Store structured data for each branch
            for i in range(max_len):
                structured_data.append({
                    "college_id": college_id,
                    "college_name": college_name,
                    "branch_id": branch_id,
                    "branch_name": branch_name,
                    "status": status,
                    "category": categories[i],
                    "rank": ranks[i],
                    "percentile": float(percentiles[i])
                })

    # Report 100% completion
    print("PROGRESS:100", flush=True)
    return structured_data

# Main function to process the PDF and output structured data as JSON


def process_pdf(pdf_path, output_path):
    try:
        print("PROGRESS:0", flush=True)  # Start at 0%

        # Extract text from PDF
        text = extract_text_from_pdf(pdf_path)

        # Parse the extracted text
        data = parse_cutoff_data(text)

        # Save as JSON
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"Processed {len(data)} records from PDF")
        return 0
    except Exception as e:
        print(f"Error processing PDF: {str(e)}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python pdf_processor.py <pdf_path> <output_path>",
              file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_path = sys.argv[2]
    sys.exit(process_pdf(pdf_path, output_path))
