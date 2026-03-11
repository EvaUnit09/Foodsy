package com.foodsy.domain;

import jakarta.persistence.*;

@Entity
@Table(name = "neighborhoods",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_neighborhood_name_borough", columnNames = {"name", "borough"})
       },
       indexes = {
           @Index(name = "idx_neighborhood_borough", columnList = "borough")
       })
public class Neighborhood {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", length = 100, nullable = false)
    private String name;

    @Column(name = "borough", length = 50, nullable = false)
    private String borough;

    @Column(name = "center_lat", nullable = false)
    private Double centerLat;

    @Column(name = "center_lng", nullable = false)
    private Double centerLng;

    @Column(name = "radius_meters", nullable = false)
    private Integer radiusMeters = 1000;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 0;

    /**
 * Creates an empty Neighborhood instance.
 *
 * <p>Required by JPA for entity instantiation and proxying.</p>
 */
public Neighborhood() {}

    /**
     * Create a Neighborhood with the given identifying values and location.
     *
     * @param name         neighborhood name; must be non-null and no longer than 100 characters
     * @param borough      borough name; must be non-null and no longer than 50 characters
     * @param centerLat    latitude of the neighborhood center in decimal degrees
     * @param centerLng    longitude of the neighborhood center in decimal degrees
     * @param radiusMeters radius of the neighborhood in meters
     * @param displayOrder ordering value used to control display priority
     */
    public Neighborhood(String name, String borough, double centerLat, double centerLng,
                        int radiusMeters, int displayOrder) {
        this.name = name;
        this.borough = borough;
        this.centerLat = centerLat;
        this.centerLng = centerLng;
        this.radiusMeters = radiusMeters;
        this.displayOrder = displayOrder;
    }

    /**
 * Gets the primary key identifier of this neighborhood.
 *
 * @return the database identifier of the neighborhood, or null if not yet persisted
 */
public Long getId() { return id; }
    /**
 * Sets the primary key identifier for this neighborhood.
 *
 * @param id the identifier to assign to this entity; may be null for transient instances
 */
public void setId(Long id) { this.id = id; }

    /**
 * The neighborhood's name.
 *
 * @return the neighborhood name
 */
public String getName() { return name; }
    /**
 * Sets the neighborhood name.
 *
 * @param name the neighborhood name; required (not null) and at most 100 characters
 */
public void setName(String name) { this.name = name; }

    /**
 * Gets the borough where the neighborhood is located.
 *
 * @return the borough name (never null)
 */
public String getBorough() { return borough; }
    /**
 * Sets the borough name of the neighborhood.
 *
 * @param borough the borough name for this neighborhood; must not be null and should be at most 50 characters
 */
public void setBorough(String borough) { this.borough = borough; }

    /**
 * The neighborhood center's latitude in decimal degrees.
 *
 * @return the center latitude in decimal degrees
 */
public Double getCenterLat() { return centerLat; }
    /**
 * Set the neighborhood center latitude in decimal degrees.
 *
 * @param centerLat the latitude in degrees (expected range: -90 to 90)
 */
public void setCenterLat(Double centerLat) { this.centerLat = centerLat; }

    /**
 * Gets the longitude of the neighborhood's center.
 *
 * @return the center longitude in decimal degrees
 */
public Double getCenterLng() { return centerLng; }
    /**
 * Sets the neighborhood center longitude.
 *
 * @param centerLng longitude in decimal degrees (east positive)
 */
public void setCenterLng(Double centerLng) { this.centerLng = centerLng; }

    /**
 * Gets the neighborhood radius in meters.
 *
 * @return the radius of the neighborhood in meters; defaults to 1000 when not set
 */
public Integer getRadiusMeters() { return radiusMeters; }
    /**
 * Set the neighborhood radius in meters.
 *
 * @param radiusMeters the radius in meters, or {@code null} to unset
 */
public void setRadiusMeters(Integer radiusMeters) { this.radiusMeters = radiusMeters; }

    /**
 * The display order used to sort neighborhoods in listings.
 *
 * @return the display order; lower values appear first. Defaults to 0 when not set.
 */
public Integer getDisplayOrder() { return displayOrder; }
    /**
 * Set the display order used to sort neighborhoods in listings.
 *
 * @param displayOrder the ordering priority where lower values are displayed before higher values; default is 0
 */
public void setDisplayOrder(Integer displayOrder) { this.displayOrder = displayOrder; }
}
