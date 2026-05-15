import type { FC } from 'react';

interface ResumeData {
  name?: string;
  title?: string;
  email?: string;
  phone?: string;
  address?: string;
  summary?: string;
  experience?: Array<{
    company?: string;
    position?: string;
    period?: string;
    description?: string;
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    period?: string;
  }>;
  skills?: string[];
}

interface ResumePreviewProps {
  data?: ResumeData | null;
}

const ResumePreview: FC<ResumePreviewProps> = ({ data }) => {
  if (!data) {
    return (
      <div className="resume-preview bg-white p-8 shadow-lg max-w-4xl mx-auto">
        <p className="text-gray-600">No resume data available.</p>
      </div>
    );
  }

  const {
    name = '',
    title = '',
    email = '',
    phone = '',
    address = '',
    summary = '',
    experience = [],
    education = [],
    skills = [],
  } = data;

  return (
    <div className="resume-preview bg-white p-8 shadow-lg max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{name}</h1>
        <p className="text-xl text-blue-600 mb-4">{title}</p>
        <div className="flex flex-wrap gap-4 text-gray-600">
          <span>📧 {email}</span>
          <span>📱 {phone}</span>
          <span>📍 {address}</span>
        </div>
      </header>

      {/* Summary */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-blue-200 pb-2">
          Summary
        </h2>
        <p className="text-gray-700 leading-relaxed">{summary}</p>
      </section>

      {/* Experience */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-blue-200 pb-2">
          Experience
        </h2>
        {experience.map((exp, index) => (
          <div key={index} className="mb-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold text-gray-900">{exp.position}</h3>
              <span className="text-sm text-gray-600">{exp.period}</span>
            </div>
            <p className="text-blue-600 font-medium mb-2">{exp.company}</p>
            <p className="text-gray-700">{exp.description}</p>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-blue-200 pb-2">
          Education
        </h2>
        {education.map((edu, index) => (
          <div key={index} className="mb-4">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-semibold text-gray-900">{edu.degree}</h3>
              <span className="text-sm text-gray-600">{edu.period}</span>
            </div>
            <p className="text-blue-600 font-medium">{edu.school}</p>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section>
        <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b-2 border-blue-200 pb-2">
          Skills
        </h2>
        <div className="flex flex-wrap gap-2">
          {skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              {skill}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
};

export default ResumePreview;