import { useIsMobile } from '../../hooks/useIsMobile';

interface HeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export default function Header({ title, subtitle, action }: HeaderProps) {
  const isMobile = useIsMobile();
  return (
    <div style={{
      ...styles.header,
      flexDirection: isMobile ? 'column' : 'row',
      alignItems: isMobile ? 'flex-start' : 'flex-start',
      gap: isMobile ? 12 : 0,
      marginBottom: isMobile ? 20 : 28,
    }}>
      <div>
        <h1 style={{ ...styles.title, fontSize: isMobile ? 20 : 24 }}>{title}</h1>
        {subtitle && <p style={styles.subtitle}>{subtitle}</p>}
      </div>
      {action && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {action}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
  },
  title: {
    fontWeight: 700,
    color: '#2D3250',
    margin: 0,
    lineHeight: 1.2,
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    margin: '4px 0 0',
  },
};
