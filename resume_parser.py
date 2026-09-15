"""
Resume Parser Service for HireMind AI
Extracts plain text and heuristic structural metadata from PDF, DOCX, and TXT resumes.
"""

import os
import re
from typing import Dict, Any, List, Optional


class ResumeParser:
    """
    Parses PDF, DOCX, and text resumes with heuristic metadata extraction.
    """

    ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.txt'}

    @classmethod
    def is_allowed_file(cls, filename: str) -> bool:
        ext = os.path.splitext(filename)[1].lower()
        return ext in cls.ALLOWED_EXTENSIONS

    @classmethod
    def parse_file(cls, file_path: str) -> Dict[str, Any]:
        """
        Parses a resume file and returns extracted text and structural metadata.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()

        if ext == '.pdf':
            text = cls._extract_from_pdf(file_path)
        elif ext == '.docx':
            text = cls._extract_from_docx(file_path)
        elif ext == '.txt':
            text = cls._extract_from_txt(file_path)
        else:
            raise ValueError(f"Unsupported file format '{ext}'. Please upload a PDF or DOCX file.")

        cleaned_text = cls._clean_text(text)

        if not cleaned_text or len(cleaned_text.strip()) < 30:
            raise ValueError(
                "Unable to extract readable text from the resume. "
                "If this is a scanned PDF image, please use a text-based PDF or DOCX file."
            )

        metadata = cls._extract_heuristics(cleaned_text, os.path.basename(file_path))

        return {
            "filename": os.path.basename(file_path),
            "file_type": ext,
            "raw_text": cleaned_text,
            "word_count": metadata["word_count"],
            "detected_sections": metadata["detected_sections"],
            "contact_info": metadata["contact_info"],
            "ats_hygiene": metadata["ats_hygiene"]
        }

    @classmethod
    def parse_raw_text(cls, text: str, source_name: str = "Pasted Resume") -> Dict[str, Any]:
        """
        Parses raw text directly without a file upload.
        """
        cleaned_text = cls._clean_text(text)
        if not cleaned_text or len(cleaned_text.strip()) < 30:
            raise ValueError("Resume text is too short. Please provide complete resume content.")

        metadata = cls._extract_heuristics(cleaned_text, source_name)

        return {
            "filename": source_name,
            "file_type": ".txt",
            "raw_text": cleaned_text,
            "word_count": metadata["word_count"],
            "detected_sections": metadata["detected_sections"],
            "contact_info": metadata["contact_info"],
            "ats_hygiene": metadata["ats_hygiene"]
        }

    @classmethod
    def _extract_from_pdf(cls, file_path: str) -> str:
        try:
            from pypdf import PdfReader
            reader = PdfReader(file_path)
            if reader.is_encrypted:
                try:
                    reader.decrypt('')
                except Exception:
                    raise ValueError("The uploaded PDF is password-protected. Please remove the password.")

            pages_text = []
            for idx, page in enumerate(reader.pages):
                extracted = page.extract_text()
                if extracted:
                    pages_text.append(extracted)

            return "\n\n".join(pages_text)
        except Exception as e:
            if "password-protected" in str(e):
                raise
            raise ValueError(f"Failed to read PDF file: {str(e)}")

    @classmethod
    def _extract_from_docx(cls, file_path: str) -> str:
        try:
            import docx
            doc = docx.Document(file_path)
            lines = [p.text for p in doc.paragraphs if p.text.strip()]

            # Also extract from tables if any
            for table in doc.tables:
                for row in table.rows:
                    row_data = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                    if row_data:
                        lines.append(" | ".join(row_data))

            return "\n".join(lines)
        except Exception as e:
            raise ValueError(f"Failed to read DOCX file: {str(e)}")

    @classmethod
    def _extract_from_txt(cls, file_path: str) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return f.read()
        except Exception as e:
            raise ValueError(f"Failed to read text file: {str(e)}")

    @classmethod
    def _clean_text(cls, text: str) -> str:
        if not text:
            return ""
        # Normalize non-breaking spaces and line breaks
        text = text.replace('\r\n', '\n').replace('\r', '\n')
        text = re.sub(r'[\t ]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        return text.strip()

    @classmethod
    def _extract_heuristics(cls, text: str, filename: str) -> Dict[str, Any]:
        """
        Extracts contact info, sections, and structural metrics.
        """
        words = re.findall(r'\b\w+\b', text)
        word_count = len(words)

        # Contact Info extraction
        emails = re.findall(r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+', text)
        phones = re.findall(r'(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}', text)
        github = re.findall(r'github\.com/[a-zA-Z0-9_-]+', text, re.IGNORECASE)
        linkedin = re.findall(r'linkedin\.com/in/[a-zA-Z0-9_-]+', text, re.IGNORECASE)

        contact_info = {
            "email": emails[0] if emails else None,
            "phone": phones[0] if phones else None,
            "github": github[0] if github else None,
            "linkedin": linkedin[0] if linkedin else None,
        }

        # Standard Section detection
        section_patterns = {
            "Skills": r'\b(skills|technical skills|technologies|core competencies|tooling)\b',
            "Experience": r'\b(experience|work experience|employment|work history|professional background)\b',
            "Education": r'\b(education|academic background|qualifications|degrees)\b',
            "Projects": r'\b(projects|personal projects|key projects|academic projects)\b',
            "Certifications": r'\b(certifications|licenses|courses|accreditation)\b'
        }

        detected_sections = {}
        text_lower = text.lower()
        for section_name, pattern in section_patterns.items():
            detected_sections[section_name] = bool(re.search(pattern, text_lower))

        # ATS Hygiene checks
        has_metrics = bool(re.search(r'\b(?:\d+%(?:\s+increase|\s+improvement|\s+reduction)?|\$\d+|\d+\s+(?:users|clients|requests|ms))\b', text, re.IGNORECASE))
        has_clear_sections = sum(1 for v in detected_sections.values() if v) >= 3
        has_contact = bool(contact_info["email"] or contact_info["phone"])
        healthy_length = 250 <= word_count <= 1400

        ats_hygiene = {
            "has_contact_info": has_contact,
            "has_standard_sections": has_clear_sections,
            "has_quantifiable_metrics": has_metrics,
            "healthy_word_count": healthy_length,
            "word_count": word_count
        }

        return {
            "word_count": word_count,
            "detected_sections": detected_sections,
            "contact_info": contact_info,
            "ats_hygiene": ats_hygiene
        }
