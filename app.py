"""
HIREMIND AI - Backend Server
Flask Application powering Agentic Resume Intelligence & Career Matching Platform.
"""

import os
import uuid
import traceback
from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

from services.resume_parser import ResumeParser
from services.ai_matcher import AIMatcher

# Load environment variables
load_dotenv()

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'hiremind-ai-secret-2025')
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize AI Service
ai_matcher = AIMatcher()


@app.route('/')
def index():
    """Renders the main single-page dashboard."""
    ai_status = {
        "live_ai_available": ai_matcher.is_live_ai_available(),
        "provider": ai_matcher.provider,
        "model": ai_matcher.model
    }
    return render_template('index.html', ai_status=ai_status)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Returns application health and current AI agent configuration."""
    return jsonify({
        "status": "healthy",
        "app": "HireMind AI",
        "version": "1.0.0",
        "live_ai_available": ai_matcher.is_live_ai_available(),
        "provider": ai_matcher.provider,
        "model": ai_matcher.model
    })


@app.route('/api/demo-data', methods=['GET'])
def get_demo_data():
    """
    Returns sample candidate resume and target job text for one-click demo loading.
    """
    sample_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sample_data')
    resume_path = os.path.join(sample_dir, 'sample_resume.txt')
    job_path = os.path.join(sample_dir, 'sample_job.txt')

    resume_text = ""
    job_text = ""

    if os.path.exists(resume_path):
        with open(resume_path, 'r', encoding='utf-8', errors='ignore') as f:
            resume_text = f.read()

    if os.path.exists(job_path):
        with open(job_path, 'r', encoding='utf-8', errors='ignore') as f:
            job_text = f.read()

    return jsonify({
        "candidate_name": "Alex Morgan",
        "job_title": "Python Backend Developer",
        "resume_text": resume_text,
        "job_description": job_text
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_fit():
    """
    Main endpoint: Parses resume (file or pasted text), performs semantic matching
    against the target job, and calculates explainable match & ATS scores.
    """
    temp_file_path = None
    try:
        job_description = request.form.get('job_description', '').strip()
        pasted_resume = request.form.get('resume_text', '').strip()
        force_demo = request.form.get('force_demo', 'false').lower() == 'true'

        if not job_description:
            return jsonify({
                "success": False,
                "error": "Please provide a target job description to match against."
            }), 400

        # Determine resume source: uploaded file or pasted text
        parsed_resume = None

        if 'resume_file' in request.files and request.files['resume_file'].filename:
            file = request.files['resume_file']
            filename = secure_filename(file.filename)

            if not ResumeParser.is_allowed_file(filename):
                return jsonify({
                    "success": False,
                    "error": "Unsupported file format. Please upload a PDF (.pdf) or Word (.docx) resume."
                }), 400

            unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
            temp_file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            file.save(temp_file_path)

            parsed_resume = ResumeParser.parse_file(temp_file_path)

        elif pasted_resume:
            parsed_resume = ResumeParser.parse_raw_text(pasted_resume, source_name="Pasted Profile")

        else:
            return jsonify({
                "success": False,
                "error": "Please upload a resume file (.pdf, .docx) or paste resume text."
            }), 400

        # Execute AI Agent Matching
        if force_demo:
            analysis = ai_matcher._generate_demo_result(
                parsed_resume['raw_text'],
                job_description,
                parsed_resume.get('ats_hygiene', {})
            )
        else:
            analysis = ai_matcher.analyze(
                parsed_resume['raw_text'],
                job_description,
                parsed_resume.get('ats_hygiene', {})
            )

        # Attach resume structural metadata
        analysis['resume_metadata'] = {
            "filename": parsed_resume.get("filename"),
            "file_type": parsed_resume.get("file_type"),
            "word_count": parsed_resume.get("word_count"),
            "contact_info": parsed_resume.get("contact_info"),
            "detected_sections": parsed_resume.get("detected_sections")
        }

        return jsonify({
            "success": True,
            "data": analysis
        })

    except ValueError as ve:
        return jsonify({
            "success": False,
            "error": str(ve)
        }), 400
    except Exception as e:
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": f"Analysis encountered an issue: {str(e)}. Try using Demo Mode or check API settings."
        }), 500
    finally:
        # Secure cleanup of uploaded file
        if temp_file_path and os.path.exists(temp_file_path):
            try:
                os.remove(temp_file_path)
            except Exception:
                pass


@app.route('/api/recruiter-batch', methods=['POST'])
def recruiter_batch():
    """
    Recruiter Mode: Evaluates multiple candidates against a single job description
    and ranks them with comparative analytics.
    """
    job_description = request.form.get('job_description', '').strip()
    if not job_description:
        return jsonify({"success": False, "error": "Job description is required for recruiter ranking."}), 400

    uploaded_files = request.files.getlist('resume_files')
    results = []

    # If no files uploaded, use pre-built sample candidates for quick demonstration
    if not uploaded_files or (len(uploaded_files) == 1 and not uploaded_files[0].filename):
        sample_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'sample_data')
        candidates_data = [
            ("Alex Morgan (Junior Backend)", "sample_resume.txt"),
            ("Jordan Rivera (Senior Cloud & DevOps)", "sample_resume_2.txt")
        ]

        for cand_name, filename in candidates_data:
            path = os.path.join(sample_dir, filename)
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                    txt = f.read()
                parsed = ResumeParser.parse_raw_text(txt, cand_name)
                analysis = ai_matcher.analyze(parsed['raw_text'], job_description, parsed['ats_hygiene'])
                analysis['candidate_name'] = cand_name
                results.append(analysis)
    else:
        for file in uploaded_files:
            if not file.filename:
                continue
            filename = secure_filename(file.filename)
            if not ResumeParser.is_allowed_file(filename):
                continue

            unique_name = f"{uuid.uuid4().hex[:8]}_{filename}"
            temp_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)
            file.save(temp_path)

            try:
                parsed = ResumeParser.parse_file(temp_path)
                candidate_name = filename.rsplit('.', 1)[0].replace('_', ' ').replace('-', ' ').title()
                analysis = ai_matcher.analyze(parsed['raw_text'], job_description, parsed['ats_hygiene'])
                analysis['candidate_name'] = candidate_name
                results.append(analysis)
            except Exception as e:
                continue
            finally:
                if os.path.exists(temp_path):
                    try:
                        os.remove(temp_path)
                    except Exception:
                        pass

    # Sort candidates by overall match score descending
    results.sort(key=lambda x: x.get('overall_match_score', 0), reverse=True)

    return jsonify({
        "success": True,
        "total_candidates": len(results),
        "rankings": results
    })


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'True').lower() == 'true'
    print(f"\n========================================================")
    print(f" HIREMIND AI - Agentic Resume Intelligence Platform")
    print(f" Running at: http://127.0.0.1:{port}")
    print(f" Live AI Provider: {ai_matcher.provider} (Active: {ai_matcher.is_live_ai_available()})")
    print(f"========================================================\n")
    app.run(host='0.0.0.0', port=port, debug=debug)
