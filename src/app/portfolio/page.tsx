'use client';

import { useEffect, useState } from 'react';

interface Project {
  id: number;
  title: string;
  description: string;
  tech: string[];
  github?: string;
  demo?: string;
}

interface Skill {
  name: string;
  level: number;
  category: 'language' | 'framework' | 'tool' | 'database';
}

const skills: Skill[] = [
  { name: 'Python', level: 95, category: 'language' },
  { name: 'Django', level: 90, category: 'framework' },
  { name: 'FastAPI', level: 85, category: 'framework' },
  { name: 'Flask', level: 80, category: 'framework' },
  { name: 'REST API', level: 90, category: 'framework' },
  { name: 'PostgreSQL', level: 85, category: 'database' },
  { name: 'MongoDB', level: 80, category: 'database' },
  { name: 'Redis', level: 75, category: 'database' },
  { name: 'Docker', level: 80, category: 'tool' },
  { name: 'AWS', level: 75, category: 'tool' },
  { name: 'Git', level: 90, category: 'tool' },
  { name: 'Linux', level: 85, category: 'tool' },
];

const projects: Project[] = [
  {
    id: 1,
    title: 'E-commerce Platform',
    description: 'Full-featured online store with payment integration, inventory management, and admin dashboard. Built with Django REST Framework and React.',
    tech: ['Django', 'REST API', 'PostgreSQL', 'React', 'Docker'],
    github: 'https://github.com',
    demo: 'https://demo.example.com',
  },
  {
    id: 2,
    title: 'Task Management API',
    description: 'Scalable task management REST API with authentication, real-time notifications, and team collaboration features.',
    tech: ['FastAPI', 'MongoDB', 'Redis', 'WebSocket'],
    github: 'https://github.com',
  },
  {
    id: 3,
    title: 'Data Analytics Dashboard',
    description: 'Interactive data visualization platform for business analytics with automated reporting and export capabilities.',
    tech: ['Python', 'Pandas', 'Plotly', 'Flask'],
    github: 'https://github.com',
    demo: 'https://demo.example.com',
  },
  {
    id: 4,
    title: 'Chat Application',
    description: 'Real-time messaging application with group chats, file sharing, and end-to-end encryption.',
    tech: ['FastAPI', 'SQLAlchemy', 'WebSocket', 'Vue.js'],
    github: 'https://github.com',
  },
  {
    id: 5,
    title: 'Web Scraper & Automation',
    description: 'Automated data collection system with scheduled tasks, data cleaning, and database storage.',
    tech: ['Python', 'Scrapy', 'Selenium', 'PostgreSQL'],
    github: 'https://github.com',
  },
  {
    id: 6,
    title: 'ML Model Deployment',
    description: 'Machine learning model serving API with monitoring, A/B testing, and auto-scaling capabilities.',
    tech: ['Python', 'TensorFlow', 'Docker', 'AWS Lambda'],
    github: 'https://github.com',
  },
];

export default function Portfolio() {
  const [activeSection, setActiveSection] = useState('home');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
      
      const sections = ['home', 'about', 'skills', 'projects', 'contact'];
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          if (rect.top <= 150 && rect.bottom >= 150) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-gray-900/95 backdrop-blur-sm shadow-lg' : 'bg-transparent'
      }`}>
        <div className="max-w-6xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <a href="#home" className="text-2xl font-bold text-cyan-400">
              &lt;Dev/&gt;
            </a>
            <div className="hidden md:flex items-center space-x-8">
              {['home', 'about', 'skills', 'projects', 'contact'].map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`capitalize text-sm font-medium transition-colors ${
                    activeSection === section 
                      ? 'text-cyan-400' 
                      : 'text-gray-300 hover:text-cyan-400'
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900"></div>
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative z-10 text-center px-6">
          <div className="mb-6 inline-block px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
            <span className="text-cyan-400 text-sm font-medium">Python Software Developer</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            Hello, I'm <span className="text-cyan-400">John</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-400 mb-10 max-w-2xl mx-auto">
            I build scalable backend systems, REST APIs, and automation solutions with Python
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => scrollToSection('projects')}
              className="px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-105"
            >
              View My Work
            </button>
            <button
              onClick={() => scrollToSection('contact')}
              className="px-8 py-4 border border-cyan-500 text-cyan-400 hover:bg-cyan-500/10 font-semibold rounded-lg transition-all"
            >
              Get In Touch
            </button>
          </div>
          
          {/* Scroll Indicator */}
          <div className="mt-16 animate-bounce">
            <svg className="w-6 h-6 mx-auto text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            About <span className="text-cyan-400">Me</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-12"></div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 text-gray-300 leading-relaxed">
              <p>
                I'm a passionate Python developer with 5+ years of experience building 
                web applications, APIs, and automation systems. I specialize in Django, 
                FastAPI, and cloud deployment.
              </p>
              <p>
                My journey started with automating repetitive tasks using Python scripts, 
                and I fell in love with backend development. Since then, I've worked on 
                various projects ranging from e-commerce platforms to data analytics dashboards.
              </p>
              <p>
                I believe in writing clean, maintainable code and continuously learning 
                new technologies. When I'm not coding, you can find me contributing to 
                open-source projects or writing technical blog posts.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">5+</div>
                <div className="text-gray-400">Years Experience</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">50+</div>
                <div className="text-gray-400">Projects Completed</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">30+</div>
                <div className="text-gray-400">Happy Clients</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-xl text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">10+</div>
                <div className="text-gray-400">Open Source Contrib</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Skills Section */}
      <section id="skills" className="py-24 px-6 bg-gray-800/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Technical <span className="text-cyan-400">Skills</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-12"></div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {skills.map((skill) => (
              <div key={skill.name} className="bg-gray-800 p-6 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-lg">{skill.name}</span>
                  <span className="text-cyan-400 text-sm">{skill.level}%</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-1000"
                    style={{ width: `${skill.level}%` }}
                  ></div>
                </div>
                <div className="mt-2 text-xs text-gray-500 capitalize">{skill.category}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Projects Section */}
      <section id="projects" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl font-bold text-center mb-4">
            Featured <span className="text-cyan-400">Projects</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-12"></div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-gray-800 rounded-xl overflow-hidden hover:transform hover:scale-[1.02] transition-all duration-300 group"
              >
                <div className="p-6">
                  <h3 className="text-xl font-bold mb-3 group-hover:text-cyan-400 transition-colors">
                    {project.title}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4 leading-relaxed">
                    {project.description}
                  </p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tech.map((tech) => (
                      <span
                        key={tech}
                        className="px-3 py-1 bg-gray-700 text-cyan-400 text-xs rounded-full"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-4 pt-4 border-t border-gray-700">
                    {project.github && (
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm">Code</span>
                      </a>
                    )}
                    {project.demo && (
                      <a
                        href={project.demo}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-gray-400 hover:text-cyan-400 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        <span className="text-sm">Demo</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 px-6 bg-gray-800/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-4">
            Get In <span className="text-cyan-400">Touch</span>
          </h2>
          <div className="w-20 h-1 bg-cyan-500 mx-auto mb-12"></div>
          
          <p className="text-gray-400 mb-10 text-lg">
            I'm always open to discussing new projects, creative ideas, or opportunities to be part of your visions.
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <a
              href="mailto:email@example.com"
              className="flex items-center gap-3 px-6 py-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <span>email@example.com</span>
            </a>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
              </svg>
              <span>GitHub</span>
            </a>
            <a
              href="https://linkedin.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-6 py-4 bg-gray-800 rounded-xl hover:bg-gray-700 transition-colors"
            >
              <svg className="w-6 h-6 text-cyan-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              <span>LinkedIn</span>
            </a>
          </div>
          
          <form className="max-w-md mx-auto space-y-4" onSubmit={(e) => e.preventDefault()}>
            <input
              type="text"
              placeholder="Your Name"
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <input
              type="email"
              placeholder="Your Email"
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors"
            />
            <textarea
              placeholder="Your Message"
              rows={5}
              className="w-full px-6 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            ></textarea>
            <button
              type="submit"
              className="w-full px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-gray-900 font-semibold rounded-lg transition-all transform hover:scale-[1.02]"
            >
              Send Message
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-800">
        <div className="max-w-6xl mx-auto text-center text-gray-500">
          <p>© {new Date().getFullYear()} Python Developer Portfolio. Built with Next.js & Tailwind CSS.</p>
        </div>
      </footer>
    </div>
  );
}
