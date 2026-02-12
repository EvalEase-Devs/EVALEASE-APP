/**
 * ISE-MSE Attainment Report Calculations
 * Calculates CO-wise marks, percentages, and attainment levels
 */

export interface CoWiseData {
    co_no: number;
    max_marks: number;
    obtained_marks: number;
    percentage: number;
}

export interface StudentRowData {
    pid: number;
    roll_no: number;
    stud_name: string;
    co_wise: Record<number, CoWiseData>;
    total_obtained: number;
    total_max: number;
    total_percentage: number;
}

export interface AttainmentData {
    co_no: number;
    students_above_target: number;
    total_students: number;
    percentage_above_target: number;
    attainment_level: number; // 1, 2, or 3
}

/**
 * Calculate CO-wise marks for a student from ISE/MSE tasks
 */
export function calculateCoWiseMarks(
    studentMarks: any[],
    tasks: any[],
    subQuestions: any[],
    coList: number[]
): Record<number, CoWiseData> {
    const coData: Record<number, CoWiseData> = {};

    // Initialize all COs
    coList.forEach(co => {
        coData[co] = { co_no: co, max_marks: 0, obtained_marks: 0, percentage: 0 };
    });

    // For each task, allocate marks to respective COs
    tasks.forEach(task => {
        const taskMarks = studentMarks.find(m => m.task_id === task.task_id);
        if (!taskMarks) return;

        if (task.assessment_type === 'ISE') {
            // ISE Subjective and MCQ: Allocate marks equally to mapped COs
            const mappedCos = task.task_co_mapping?.map((m: { co_no: number }) => m.co_no) || [];
            if (mappedCos.length > 0) {
                const marksPerCo = taskMarks.total_marks_obtained / mappedCos.length;
                const maxMarksPerCo = task.max_marks / mappedCos.length;

                mappedCos.forEach((co: number) => {
                    coData[co].max_marks += maxMarksPerCo;
                    coData[co].obtained_marks += marksPerCo;
                });
            }
        } else if (task.assessment_type === 'MSE') {
            // MSE: Allocate question-wise marks to respective COs
            if (task.sub_questions && taskMarks.question_marks) {
                task.sub_questions.forEach((question: any) => {
                    const co = parseInt(question.co.replace('CO', ''));
                    const obtainedMarks = taskMarks.question_marks?.[question.label] || 0;

                    if (coData[co]) {
                        coData[co].max_marks += question.marks;
                        coData[co].obtained_marks += obtainedMarks;
                    }
                });
            }
        }
    });

    // Calculate percentages
    Object.keys(coData).forEach(coKey => {
        const co = parseInt(coKey);
        if (coData[co].max_marks > 0) {
            coData[co].percentage = (coData[co].obtained_marks / coData[co].max_marks) * 100;
        }
    });

    return coData;
}

/**
 * Calculate total marks and percentage for a student
 */
export function calculateTotalMarks(
    coWiseData: Record<number, CoWiseData>
): { total_obtained: number; total_max: number; percentage: number } {
    let totalObtained = 0;
    let totalMax = 0;

    Object.values(coWiseData).forEach(co => {
        totalObtained += co.obtained_marks;
        totalMax += co.max_marks;
    });

    const percentage = totalMax > 0 ? (totalObtained / totalMax) * 100 : 0;

    return { total_obtained: totalObtained, total_max: totalMax, percentage };
}

/**
 * Calculate CO attainment based on students scoring above target
 */
export function calculateCoAttainment(
    studentRows: StudentRowData[],
    coList: number[],
    subjectTarget: number
): AttainmentData[] {
    const attainmentData: AttainmentData[] = [];

    coList.forEach(co => {
        const studentsAboveTarget = studentRows.filter(
            row => row.co_wise[co] && row.co_wise[co].percentage >= subjectTarget
        ).length;

        const percentageAboveTarget =
            studentRows.length > 0 ? (studentsAboveTarget / studentRows.length) * 100 : 0;

        // Determine attainment level (1, 2, or 3)
        let attainmentLevel = 1;
        if (percentageAboveTarget >= 60) {
            attainmentLevel = 3;
        } else if (percentageAboveTarget >= 50) {
            attainmentLevel = 2;
        }

        attainmentData.push({
            co_no: co,
            students_above_target: studentsAboveTarget,
            total_students: studentRows.length,
            percentage_above_target: percentageAboveTarget,
            attainment_level: attainmentLevel
        });
    });

    return attainmentData;
}

/**
 * Count students scoring above percentage threshold
 */
export function countStudentsAboveThreshold(
    studentRows: StudentRowData[],
    threshold: number
): { count: number; percentage: number } {
    const count = studentRows.filter(row => row.total_percentage >= threshold).length;
    const percentage =
        studentRows.length > 0 ? (count / studentRows.length) * 100 : 0;

    return { count, percentage };
}
