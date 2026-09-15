"""
Scoring Engine for HireMind AI
Provides transparent, deterministic, and explainable scoring models for
Match Fit and ATS Compatibility.
"""

from typing import Dict, Any, List


class ScoringEngine:
    """
    Computes transparent candidate-job match score and ATS compatibility metrics.
    Formula:
        Overall Score = (0.40 * Skills) + (0.30 * Experience) + (0.15 * Education) + (0.15 * Job Relevance)
    """

    WEIGHT_SKILLS = 0.40
    WEIGHT_EXPERIENCE = 0.30
    WEIGHT_EDUCATION = 0.15
    WEIGHT_RELEVANCE = 0.15

    @classmethod
    def calculate_overall_match(
        cls,
        skills_score: float,
        experience_score: float,
        education_score: float,
        relevance_score: float
    ) -> Dict[str, Any]:
        """
        Computes weighted score and determines match classification label.
        """
        # Clamp inputs between 0 and 100
        skills = max(0, min(100, float(skills_score)))
        experience = max(0, min(100, float(experience_score)))
        education = max(0, min(100, float(education_score)))
        relevance = max(0, min(100, float(relevance_score)))

        overall = (
            (skills * cls.WEIGHT_SKILLS) +
            (experience * cls.WEIGHT_EXPERIENCE) +
            (education * cls.WEIGHT_EDUCATION) +
            (relevance * cls.WEIGHT_RELEVANCE)
        )
        overall_rounded = int(round(overall))

        label = cls.get_match_label(overall_rounded)

        return {
            "overall_match_score": overall_rounded,
            "match_label": label,
            "skills_match_score": int(round(skills)),
            "experience_match_score": int(round(experience)),
            "education_match_score": int(round(education)),
            "relevance_match_score": int(round(relevance)),
            "scoring_formula": "40% Skills + 30% Experience + 15% Education + 15% Relevance"
        }

    @classmethod
    def get_match_label(cls, score: int) -> str:
        if score >= 85:
            return "Strong Match"
        elif score >= 70:
            return "Good Match"
        elif score >= 50:
            return "Moderate Match"
        else:
            return "Low Match"

    @classmethod
    def calculate_ats_score(
        cls,
        ats_hygiene: Dict[str, Any],
        matching_skills_count: int,
        missing_skills_count: int,
        base_ai_ats: int = None
    ) -> Dict[str, Any]:
        """
        Evaluates ATS Compatibility based on structure, quantifiable metrics,
        keyword density, and formatting.
        """
        score = 40  # baseline
        strengths: List[str] = []
        improvements: List[str] = []

        # 1. Contact Info check
        if ats_hygiene.get("has_contact_info"):
            score += 12
            strengths.append("Standard contact information clearly identified (Email/Phone)")
        else:
            improvements.append("Ensure header contains clear email address and phone number")

        # 2. Standard section headers
        if ats_hygiene.get("has_standard_sections"):
            score += 15
            strengths.append("Standard ATS section headers detected (Experience, Education, Skills)")
        else:
            improvements.append("Use standard section headings (e.g. 'Skills', 'Work Experience', 'Education')")

        # 3. Quantifiable metrics & achievements
        if ats_hygiene.get("has_quantifiable_metrics"):
            score += 15
            strengths.append("Includes measurable project achievements and quantifiable metrics")
        else:
            improvements.append("Add measurable outcomes in project bullets (e.g. 'reduced latency by 25%')")

        # 4. Word count & length
        if ats_hygiene.get("healthy_word_count"):
            score += 10
            strengths.append(f"Optimal resume length ({ats_hygiene.get('word_count', 450)} words)")
        else:
            wc = ats_hygiene.get("word_count", 0)
            if wc < 250:
                improvements.append("Resume content is sparse; expand on technical projects and responsibilities")
            else:
                improvements.append("Resume is lengthy; consider condensing to 1-2 pages for ATS readability")

        # 5. Skill alignment ratio
        total_skills = matching_skills_count + missing_skills_count
        if total_skills > 0:
            ratio = matching_skills_count / total_skills
            skill_pts = int(ratio * 18)
            score += skill_pts
            if ratio >= 0.6:
                strengths.append(f"High keyword alignment ({matching_skills_count} matching technical terms)")
            else:
                improvements.append("Incorporate more target keywords and tech stack terminology from the job description")
        else:
            score += 10

        # Incorporate AI baseline if provided
        if base_ai_ats is not None and base_ai_ats > 0:
            final_ats = int(round(0.6 * base_ai_ats + 0.4 * score))
        else:
            final_ats = score

        final_ats = max(35, min(98, final_ats))

        return {
            "ats_score": final_ats,
            "ats_strengths": strengths,
            "ats_improvements": improvements
        }
